// Server-side transport for every MusicBrainz Web Service request. Keeping
// identification, pacing, timeout, and error behavior here prevents callers
// from accidentally bypassing the provider boundary.

const MUSICBRAINZ_USER_AGENT =
  "Standards/0.1.0 (https://github.com/jdyck/tunes)";
const MUSICBRAINZ_REQUEST_INTERVAL_MS = 1_000;
const MUSICBRAINZ_TIMEOUT_MS = 20_000;

export type MusicBrainzErrorCategory =
  | "aborted"
  | "timeout"
  | "rate-limited"
  | "upstream-response"
  | "malformed-response"
  | "network";

export class MusicBrainzTransportError extends Error {
  readonly category: MusicBrainzErrorCategory;
  readonly status: number | null;
  override readonly cause: unknown;

  constructor(
    message: string,
    options: {
      category: MusicBrainzErrorCategory;
      status?: number;
      cause?: unknown;
    }
  ) {
    super(message);
    this.name = "MusicBrainzTransportError";
    this.category = options.category;
    this.status = options.status ?? null;
    this.cause = options.cause;
  }
}

type FetchImplementation = (
  input: string | URL,
  init?: RequestInit
) => Promise<Response>;

interface MusicBrainzTransportOptions {
  fetchImplementation?: FetchImplementation;
  intervalMs?: number;
  timeoutMs?: number;
  now?: () => number;
  sleep?: (delayMs: number, signal?: AbortSignal) => Promise<void>;
  scheduleTimeout?: (callback: () => void, delayMs: number) => unknown;
  cancelTimeout?: (handle: unknown) => void;
}

interface MusicBrainzRequestOptions {
  signal?: AbortSignal;
}

const abortError = (cause?: unknown): MusicBrainzTransportError =>
  new MusicBrainzTransportError("MusicBrainz request was aborted", {
    category: "aborted",
    cause,
  });

const defaultSleep = (
  delayMs: number,
  signal?: AbortSignal
): Promise<void> => {
  if (signal?.aborted) return Promise.reject(abortError(signal.reason));
  if (delayMs <= 0) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      signal?.removeEventListener("abort", handleAbort);
      resolve();
    }, delayMs);

    const handleAbort = () => {
      clearTimeout(timeout);
      reject(abortError(signal?.reason));
    };

    signal?.addEventListener("abort", handleAbort, { once: true });
  });
};

export const createMusicBrainzTransport = (
  options: MusicBrainzTransportOptions = {}
) => {
  const fetchImplementation = options.fetchImplementation ?? fetch;
  const intervalMs = options.intervalMs ?? MUSICBRAINZ_REQUEST_INTERVAL_MS;
  const timeoutMs = options.timeoutMs ?? MUSICBRAINZ_TIMEOUT_MS;
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? defaultSleep;
  const scheduleTimeout =
    options.scheduleTimeout ??
    ((callback: () => void, delayMs: number) => setTimeout(callback, delayMs));
  const cancelTimeout =
    options.cancelTimeout ??
    ((handle: unknown) => clearTimeout(handle as ReturnType<typeof setTimeout>));

  let queueTail = Promise.resolve();
  let lastStartedAt: number | null = null;

  const acquireStartSlot = async (
    signal?: AbortSignal
  ): Promise<() => void> => {
    const previousSlot = queueTail;
    let releaseSlot!: () => void;
    queueTail = new Promise<void>((resolve) => {
      releaseSlot = resolve;
    });

    await previousSlot;
    try {
      if (signal?.aborted) throw abortError(signal.reason);

      if (lastStartedAt !== null) {
        const remainingDelay = Math.max(0, lastStartedAt + intervalMs - now());
        await sleep(remainingDelay, signal);
      }

      if (signal?.aborted) throw abortError(signal.reason);
      lastStartedAt = now();
      return releaseSlot;
    } catch (error) {
      releaseSlot();
      throw error;
    }
  };

  const fetchJson = async <T>(
    url: string | URL,
    requestOptions: MusicBrainzRequestOptions = {}
  ): Promise<T> => {
    const releaseStartSlot = await acquireStartSlot(requestOptions.signal);

    const controller = new AbortController();
    let timedOut = false;
    const forwardAbort = () => controller.abort(requestOptions.signal?.reason);
    requestOptions.signal?.addEventListener("abort", forwardAbort, { once: true });

    const timeoutHandle = scheduleTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    let responsePromise: Promise<Response>;
    try {
      responsePromise = fetchImplementation(url, {
        headers: {
          "User-Agent": MUSICBRAINZ_USER_AGENT,
          Accept: "application/json",
        },
        signal: controller.signal,
      });
    } catch (error) {
      responsePromise = Promise.reject(error);
    } finally {
      // fetch() starts the upstream request when invoked, so the next queued
      // caller can begin waiting as soon as this promise has been created.
      releaseStartSlot();
    }

    try {
      let response: Response;
      try {
        response = await responsePromise;
      } catch (error) {
        if (timedOut) {
          throw new MusicBrainzTransportError(
            `MusicBrainz request timed out after ${timeoutMs}ms`,
            { category: "timeout", cause: error }
          );
        }
        if (requestOptions.signal?.aborted) throw abortError(error);
        throw new MusicBrainzTransportError("MusicBrainz network request failed", {
          category: "network",
          cause: error,
        });
      }

      if (!response.ok) {
        const category: MusicBrainzErrorCategory =
          response.status === 429 || response.status === 503
            ? "rate-limited"
            : "upstream-response";
        throw new MusicBrainzTransportError(
          `MusicBrainz responded with status ${response.status}`,
          { category, status: response.status }
        );
      }

      try {
        return (await response.json()) as T;
      } catch (error) {
        if (timedOut) {
          throw new MusicBrainzTransportError(
            `MusicBrainz request timed out after ${timeoutMs}ms`,
            { category: "timeout", cause: error }
          );
        }
        if (requestOptions.signal?.aborted) throw abortError(error);
        throw new MusicBrainzTransportError(
          "MusicBrainz returned a malformed JSON response",
          { category: "malformed-response", status: response.status, cause: error }
        );
      }
    } finally {
      cancelTimeout(timeoutHandle);
      requestOptions.signal?.removeEventListener("abort", forwardAbort);
    }
  };

  return { fetchJson };
};

const musicBrainzTransport = createMusicBrainzTransport();

export const fetchMusicBrainzJson = musicBrainzTransport.fetchJson;

export const isMusicBrainzNotFound = (error: unknown): boolean =>
  error instanceof MusicBrainzTransportError && error.status === 404;
