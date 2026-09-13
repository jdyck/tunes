import {
  env,
  httpAction,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { ActionCtx } from "./_generated/server";
import { getCurrentUser } from "./model/auth";
import { loadMembership } from "./model/songs";
import { sanitizeFileName } from "./model/songFiles";
import {
  acceptedSongFileContentTypes,
  isSongFileContentType,
  MAX_SONG_FILE_SIZE_BYTES,
} from "@/types/songFiles.ts";
import type { SongFileContentType } from "@/types/songFiles.ts";

const acceptedContentTypeValidator = v.union(
  ...acceptedSongFileContentTypes.map((contentType) => v.literal(contentType)),
);

const songFileViewValidator = v.object({
  id: v.id("songFiles"),
  fileName: v.string(),
  contentType: acceptedContentTypeValidator,
  sizeBytes: v.number(),
  createdAt: v.string(),
});

const songFileForHttpValidator = songFileViewValidator.extend({
  storageId: v.id("_storage"),
});

const uploadAccessValidator = v.union(
  v.object({ kind: v.literal("not_initialized") }),
  v.object({ kind: v.literal("not_member") }),
  v.object({ kind: v.literal("allowed") }),
);

const songFileAccessValidator = v.union(
  v.object({ kind: v.literal("not_initialized") }),
  v.object({ kind: v.literal("not_found") }),
  v.object({
    kind: v.literal("allowed"),
    songFile: songFileForHttpValidator,
  }),
);

const hasMagicBytesForContentType = (
  contentType: SongFileContentType,
  bytes: Uint8Array,
) => {
  switch (contentType) {
    case "application/pdf":
      return (
        bytes.length >= 5 &&
        bytes[0] === 0x25 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x44 &&
        bytes[3] === 0x46 &&
        bytes[4] === 0x2d
      );
    case "image/jpeg":
      return (
        bytes.length >= 3 &&
        bytes[0] === 0xff &&
        bytes[1] === 0xd8 &&
        bytes[2] === 0xff
      );
    case "image/png":
      return (
        bytes.length >= 8 &&
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47 &&
        bytes[4] === 0x0d &&
        bytes[5] === 0x0a &&
        bytes[6] === 0x1a &&
        bytes[7] === 0x0a
      );
    case "image/webp":
      return (
        bytes.length >= 12 &&
        bytes[0] === 0x52 &&
        bytes[1] === 0x49 &&
        bytes[2] === 0x46 &&
        bytes[3] === 0x46 &&
        bytes[8] === 0x57 &&
        bytes[9] === 0x45 &&
        bytes[10] === 0x42 &&
        bytes[11] === 0x50
      );
  }
};

const contentDispositionFileName = (fileName: string) => {
  const asciiName = fileName
    .normalize("NFKD")
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/["\\]/g, "_")
    .trim() || "song-file";
  return `inline; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
};

const getRequestedSongFileId = (request: Request): Id<"songFiles"> | null => {
  const pathname = new URL(request.url).pathname;
  const prefix = "/song-files/";
  if (!pathname.startsWith(prefix)) return null;
  const encodedId = pathname.slice(prefix.length);
  if (!encodedId || encodedId.includes("/")) return null;
  try {
    return decodeURIComponent(encodedId) as Id<"songFiles">;
  } catch {
    return null;
  }
};

const requestOriginIsAllowed = (request: Request) => {
  const origin = request.headers.get("Origin");
  return origin === null || (env.APP_ORIGIN !== undefined && origin === env.APP_ORIGIN);
};

const corsHeaders = (request: Request) => {
  const headers = new Headers({ Vary: "Origin" });
  const origin = request.headers.get("Origin");
  if (origin !== null && env.APP_ORIGIN === origin) {
    headers.set("Access-Control-Allow-Origin", origin);
  }
  return headers;
};

const response = (
  request: Request,
  body: BodyInit | null,
  init: ResponseInit = {},
) => {
  const headers = corsHeaders(request);
  for (const [name, value] of new Headers(init.headers)) headers.set(name, value);
  return new Response(body, { ...init, headers });
};

const errorResponse = (request: Request, status: number, message: string) =>
  response(request, message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });

const resolveAuthorizedSongFile = async (
  ctx: ActionCtx,
  request: Request,
) => {
  const songFileId = getRequestedSongFileId(request);
  if (!songFileId) {
    return {
      kind: "error",
      response: errorResponse(request, 400, "A file is required"),
    } as const;
  }

  const access = await ctx
    .runQuery(internal.songFiles.getAccessForHttp, { songFileId })
    .catch(() => null);
  if (!access) {
    return {
      kind: "error",
      response: errorResponse(request, 400, "The file is invalid"),
    } as const;
  }
  if (access.kind === "not_initialized") {
    return {
      kind: "error",
      response: errorResponse(request, 401, "Unauthorized"),
    } as const;
  }
  if (access.kind === "not_found") {
    return {
      kind: "error",
      response: errorResponse(request, 404, "File not found"),
    } as const;
  }

  return { kind: "allowed", songFileId, songFile: access.songFile } as const;
};

const authenticated = async (ctx: ActionCtx) => {
  try {
    return (await ctx.auth.getUserIdentity()) !== null;
  } catch {
    return false;
  }
};

const preflight = (allowedMethods: string) =>
  httpAction(async (_ctx, request) => {
    if (!requestOriginIsAllowed(request)) {
      return errorResponse(request, 403, "Forbidden");
    }

    const requestedMethod = request.headers.get("Access-Control-Request-Method");
    const requestedHeaders = request.headers
      .get("Access-Control-Request-Headers")
      ?.split(",")
      .map((header) => header.trim().toLowerCase()) ?? [];
    const allowedHeaders = new Set([
      "authorization",
      "content-type",
      "x-song-file-name",
    ]);
    const requestedMethodIsAllowed = allowedMethods
      .split(",")
      .map((method) => method.trim())
      .includes(requestedMethod ?? "");
    if (
      !requestedMethodIsAllowed ||
      requestedHeaders.some((header) => !allowedHeaders.has(header))
    ) {
      return errorResponse(request, 400, "Invalid CORS preflight request");
    }

    return response(request, null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Methods": allowedMethods,
        "Access-Control-Allow-Headers":
          "Authorization, Content-Type, X-Song-File-Name",
        "Access-Control-Max-Age": "86400",
      },
    });
  });

export const uploadOptions = preflight("POST, OPTIONS");
export const attachmentOptions = preflight("DELETE, GET, OPTIONS");

export const listMine = query({
  args: { songId: v.id("songs") },
  returns: v.array(songFileViewValidator),
  handler: async (ctx, { songId }) => {
    const user = await getCurrentUser(ctx);
    const membership = await loadMembership(ctx, user._id, songId);
    if (!membership) throw new Error("Song not found in your list");

    const songFiles = await ctx.db
      .query("songFiles")
      .withIndex("by_userId_and_songId_and_createdAt", (query) =>
        query.eq("userId", user._id).eq("songId", songId),
      )
      .order("desc")
      .take(1000);
    return songFiles.map((songFile) => ({
      id: songFile._id,
      fileName: songFile.fileName,
      contentType: songFile.contentType,
      sizeBytes: songFile.sizeBytes,
      createdAt: songFile.createdAt,
    }));
  },
});

export const getUploadAccess = internalQuery({
  args: { songId: v.id("songs") },
  returns: uploadAccessValidator,
  handler: async (ctx, { songId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { kind: "not_initialized" } as const;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkTokenIdentifier", (query) =>
        query.eq("clerkTokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (!user) return { kind: "not_initialized" } as const;
    const membership = await loadMembership(ctx, user._id, songId);
    return membership
      ? ({ kind: "allowed" } as const)
      : ({ kind: "not_member" } as const);
  },
});

export const getAccessForHttp = internalQuery({
  args: { songFileId: v.id("songFiles") },
  returns: songFileAccessValidator,
  handler: async (ctx, { songFileId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { kind: "not_initialized" } as const;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkTokenIdentifier", (query) =>
        query.eq("clerkTokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (!user) return { kind: "not_initialized" } as const;

    const songFile = await ctx.db.get(songFileId);
    if (!songFile || songFile.userId !== user._id) {
      return { kind: "not_found" } as const;
    }
    const membership = await loadMembership(ctx, user._id, songFile.songId);
    if (!membership) return { kind: "not_found" } as const;

    return {
      kind: "allowed",
      songFile: {
        id: songFile._id,
        storageId: songFile.storageId,
        fileName: songFile.fileName,
        contentType: songFile.contentType,
        sizeBytes: songFile.sizeBytes,
        createdAt: songFile.createdAt,
      },
    } as const;
  },
});

export const createFromHttp = internalMutation({
  args: {
    songId: v.id("songs"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    contentType: acceptedContentTypeValidator,
    sizeBytes: v.number(),
  },
  returns: v.id("songFiles"),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const membership = await loadMembership(ctx, user._id, args.songId);
    if (!membership) throw new Error("Song not found in your list");
    if (!Number.isSafeInteger(args.sizeBytes) || args.sizeBytes <= 0) {
      throw new Error("File size is invalid");
    }
    if (args.sizeBytes > MAX_SONG_FILE_SIZE_BYTES) {
      throw new Error("File exceeds the 15 MiB limit");
    }
    return ctx.db.insert("songFiles", {
      userId: user._id,
      songId: args.songId,
      storageId: args.storageId,
      fileName: sanitizeFileName(args.fileName),
      contentType: args.contentType,
      sizeBytes: args.sizeBytes,
      createdAt: new Date().toISOString(),
    });
  },
});

export const removeAfterStorageDelete = internalMutation({
  args: { songFileId: v.id("songFiles") },
  returns: v.boolean(),
  handler: async (ctx, { songFileId }) => {
    const user = await getCurrentUser(ctx);
    const songFile = await ctx.db.get(songFileId);
    if (!songFile) return false;
    if (songFile.userId !== user._id) throw new Error("File not found");
    const membership = await loadMembership(ctx, user._id, songFile.songId);
    if (!membership) throw new Error("File not found");
    await ctx.db.delete(songFile._id);
    return true;
  },
});

export const upload = httpAction(async (ctx, request) => {
  if (!requestOriginIsAllowed(request)) {
    return errorResponse(request, 403, "Forbidden");
  }
  if (!(await authenticated(ctx))) {
    return errorResponse(request, 401, "Unauthorized");
  }

  const songId = new URL(request.url).searchParams.get("songId") as Id<"songs"> | null;
  if (!songId) return errorResponse(request, 400, "A Song is required");
  const access = await ctx
    .runQuery(internal.songFiles.getUploadAccess, { songId })
    .catch(() => null);
  if (!access) {
    return errorResponse(request, 400, "The Song is invalid");
  }
  if (access.kind === "not_initialized") {
    return errorResponse(request, 401, "Unauthorized");
  }
  if (access.kind === "not_member") {
    return errorResponse(request, 404, "Song not found in your list");
  }

  const contentLength = request.headers.get("Content-Length");
  if (
    contentLength !== null &&
    (!/^\d+$/.test(contentLength) || Number(contentLength) > MAX_SONG_FILE_SIZE_BYTES)
  ) {
    return errorResponse(request, 413, "Files must not exceed 15 MiB");
  }
  const contentType = request.headers.get("Content-Type")?.toLowerCase();
  if (!contentType || !isSongFileContentType(contentType)) {
    return errorResponse(
      request,
      415,
      "Choose a PDF, JPEG, PNG, or WebP file",
    );
  }
  const encodedFileName = request.headers.get("X-Song-File-Name");
  if (!encodedFileName) return errorResponse(request, 400, "A file name is required");

  let fileName: string;
  try {
    fileName = sanitizeFileName(decodeURIComponent(encodedFileName));
  } catch {
    return errorResponse(request, 400, "The file name is invalid");
  }

  let blob: Blob;
  try {
    blob = await request.blob();
  } catch {
    return errorResponse(request, 400, "The file could not be read");
  }
  if (blob.size === 0) return errorResponse(request, 400, "The file is empty");
  if (blob.size > MAX_SONG_FILE_SIZE_BYTES) {
    return errorResponse(request, 413, "Files must not exceed 15 MiB");
  }
  const magicBytes = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  if (!hasMagicBytesForContentType(contentType, magicBytes)) {
    return errorResponse(request, 415, "The file does not match its type");
  }

  const storageId = await ctx.storage.store(new Blob([blob], { type: contentType }));
  try {
    const songFileId = await ctx.runMutation(internal.songFiles.createFromHttp, {
      songId,
      storageId,
      fileName,
      contentType,
      sizeBytes: blob.size,
    });
    return response(request, JSON.stringify({ songFileId }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    try {
      await ctx.storage.delete(storageId);
    } catch (cleanupError) {
      console.error("Song file storage cleanup failed:", cleanupError);
    }
    console.error("Song file metadata creation failed:", error);
    return errorResponse(request, 500, "Could not save the file");
  }
});

export const download = httpAction(async (ctx, request): Promise<Response> => {
  if (!requestOriginIsAllowed(request)) {
    return errorResponse(request, 403, "Forbidden");
  }
  if (!(await authenticated(ctx))) {
    return errorResponse(request, 401, "Unauthorized");
  }
  const file = await resolveAuthorizedSongFile(ctx, request);
  if (file.kind === "error") return file.response;
  const blob = await ctx.storage.get(file.songFile.storageId);
  if (!blob) return errorResponse(request, 404, "File not found");

  return response(request, blob, {
    status: 200,
    headers: {
      "Content-Type": file.songFile.contentType,
      "Content-Disposition": contentDispositionFileName(file.songFile.fileName),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
});

export const remove = httpAction(async (ctx, request): Promise<Response> => {
  if (!requestOriginIsAllowed(request)) {
    return errorResponse(request, 403, "Forbidden");
  }
  if (!(await authenticated(ctx))) {
    return errorResponse(request, 401, "Unauthorized");
  }
  const file = await resolveAuthorizedSongFile(ctx, request);
  if (file.kind === "error") return file.response;

  await ctx.storage.delete(file.songFile.storageId);
  try {
    await ctx.runMutation(internal.songFiles.removeAfterStorageDelete, {
      songFileId: file.songFileId,
    });
  } catch (error) {
    console.error("Song file metadata deletion failed:", error);
    return errorResponse(request, 500, "Could not delete the file");
  }
  return response(request, null, { status: 204 });
});
