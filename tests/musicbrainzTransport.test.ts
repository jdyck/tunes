import assert from "node:assert/strict";
import test from "node:test";
import {
  createMusicBrainzTransport,
  MusicBrainzTransportError,
} from "../src/lib/musicbrainzTransport.ts";

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("paces concurrent request starts and centralizes MusicBrainz headers", async () => {
  let currentTime = 0;
  const starts: number[] = [];
  const headers: Headers[] = [];
  const timeoutStarts: { at: number; delay: number }[] = [];
  const transport = createMusicBrainzTransport({
    now: () => currentTime,
    sleep: async (delayMs) => {
      currentTime += delayMs;
    },
    scheduleTimeout: (_callback, delayMs) => {
      timeoutStarts.push({ at: currentTime, delay: delayMs });
      return 1;
    },
    cancelTimeout: () => undefined,
    fetchImplementation: async (_url, init) => {
      starts.push(currentTime);
      headers.push(new Headers(init?.headers));
      return jsonResponse({ ok: true });
    },
  });

  await Promise.all([
    transport.fetchJson("https://musicbrainz.org/ws/2/work/one"),
    transport.fetchJson("https://musicbrainz.org/ws/2/work/two"),
    transport.fetchJson("https://musicbrainz.org/ws/2/work/three"),
  ]);

  assert.deepEqual(starts, [0, 1_000, 2_000]);
  assert.deepEqual(timeoutStarts, [
    { at: 0, delay: 20_000 },
    { at: 1_000, delay: 20_000 },
    { at: 2_000, delay: 20_000 },
  ]);
  assert.equal(headers[0].get("Accept"), "application/json");
  assert.equal(
    headers[0].get("User-Agent"),
    "Standards/0.1.0 (https://github.com/jdyck/tunes)"
  );
});

test("starts the upstream timeout after the queue wait", async () => {
  let timeoutDelay: number | null = null;
  const transport = createMusicBrainzTransport({
    intervalMs: 0,
    scheduleTimeout: (callback, delayMs) => {
      timeoutDelay = delayMs;
      callback();
      return 1;
    },
    cancelTimeout: () => undefined,
    fetchImplementation: async (_url, init) => {
      assert.equal(init?.signal?.aborted, true);
      throw new DOMException("Aborted", "AbortError");
    },
  });

  await assert.rejects(
    transport.fetchJson("https://musicbrainz.org/ws/2/work/timeout"),
    (error: unknown) =>
      error instanceof MusicBrainzTransportError && error.category === "timeout"
  );
  assert.equal(timeoutDelay, 20_000);
});

test("normalizes rate-limit responses without retrying", async () => {
  let requestCount = 0;
  const transport = createMusicBrainzTransport({
    intervalMs: 0,
    scheduleTimeout: () => 1,
    cancelTimeout: () => undefined,
    fetchImplementation: async () => {
      requestCount += 1;
      return jsonResponse({ error: "slow down" }, 503);
    },
  });

  await assert.rejects(
    transport.fetchJson("https://musicbrainz.org/ws/2/work/rate-limited"),
    (error: unknown) =>
      error instanceof MusicBrainzTransportError &&
      error.category === "rate-limited" &&
      error.status === 503
  );
  assert.equal(requestCount, 1);
});

test("normalizes malformed JSON responses", async () => {
  const transport = createMusicBrainzTransport({
    intervalMs: 0,
    scheduleTimeout: () => 1,
    cancelTimeout: () => undefined,
    fetchImplementation: async () => new Response("not json"),
  });

  await assert.rejects(
    transport.fetchJson("https://musicbrainz.org/ws/2/work/malformed"),
    (error: unknown) =>
      error instanceof MusicBrainzTransportError &&
      error.category === "malformed-response"
  );
});

test("a cancelled queued request does not block later requests", async () => {
  const controller = new AbortController();
  controller.abort();
  const transport = createMusicBrainzTransport({
    intervalMs: 0,
    scheduleTimeout: () => 1,
    cancelTimeout: () => undefined,
    fetchImplementation: async () => jsonResponse({ ok: true }),
  });

  const first = transport.fetchJson("https://musicbrainz.org/ws/2/work/one");
  const cancelled = transport.fetchJson(
    "https://musicbrainz.org/ws/2/work/cancelled",
    { signal: controller.signal }
  );
  const third = transport.fetchJson<{ ok: boolean }>(
    "https://musicbrainz.org/ws/2/work/three"
  );

  await first;
  await assert.rejects(
    cancelled,
    (error: unknown) =>
      error instanceof MusicBrainzTransportError && error.category === "aborted"
  );
  assert.deepEqual(await third, { ok: true });
});
