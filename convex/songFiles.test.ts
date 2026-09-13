/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const identity = (subject: string) => ({
  subject,
  tokenIdentifier: `https://clerk.example.test|${subject}`,
  issuer: "https://clerk.example.test",
  email: `${subject}@example.test`,
});

const songInput = (name: string) => ({
  name,
  year: 1930,
  wikipediaExtract: null,
  wikipediaUrl: null,
  musicbrainzWorkId: null,
  workDateStart: null,
  workDateEnd: null,
});

const validPdf = () =>
  new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37])], {
    type: "application/pdf",
  });

const upload = (
  client: {
    fetch: (path: string, init?: RequestInit) => Promise<Response>;
  },
  songId: string,
  file = validPdf(),
  fileName = "song-file.pdf",
) =>
  client.fetch(`/song-files?songId=${songId}`, {
    method: "POST",
    headers: {
      "Content-Type": file.type,
      "X-Song-File-Name": encodeURIComponent(fileName),
    },
    body: file,
  });

test("keeps Song Files private while a discoverable Song is shared", async () => {
  const t = convexTest({ schema, modules });
  const owner = t.withIdentity(identity("owner"));
  const other = t.withIdentity(identity("other"));
  await owner.mutation(api.users.ensureCurrent, {});
  await other.mutation(api.users.ensureCurrent, {});
  const ownerUser = await owner.query(api.users.current, {});
  const songId = await owner.mutation(api.songs.create, {
    requestId: "song-file-song",
    shared: songInput("Body and Soul"),
    writers: [],
  });

  await expect(
    t.query(api.songFiles.listMine, { songId }),
  ).rejects.toThrow("Unauthenticated");
  await expect(
    other.query(api.songFiles.listMine, { songId }),
  ).rejects.toThrow("Song not found in your list");

  const anonymousUpload = await upload(t, songId);
  expect(anonymousUpload.status).toBe(401);

  const nonMemberUpload = await upload(other, songId);
  expect(nonMemberUpload.status).toBe(404);

  const created = await upload(owner, songId, validPdf(), "score / draft.pdf");
  expect(created.status).toBe(201);
  const { songFileId } = (await created.json()) as { songFileId: string };
  const ownerFiles = await owner.query(api.songFiles.listMine, { songId });
  expect(ownerFiles).toHaveLength(1);
  expect(ownerFiles[0]).toMatchObject({
    id: songFileId,
    fileName: "score - draft.pdf",
    contentType: "application/pdf",
    sizeBytes: 8,
  });
  expect(ownerFiles[0]).not.toHaveProperty("storageId");

  await t.mutation(internal.users.setRole, {
    clerkSubject: "owner",
    role: "admin",
  });
  await owner.mutation(api.songs.setDiscoverability, {
    songId,
    isDiscoverable: true,
  });
  await other.mutation(api.songs.addDiscoverable, { songId });
  await t.mutation(internal.users.setRole, {
    clerkSubject: "other",
    role: "admin",
  });

  await expect(other.query(api.songFiles.listMine, { songId })).resolves.toEqual([]);
  expect((await other.fetch(`/song-files/${songFileId}`)).status).toBe(404);
  expect(
    (await other.fetch(`/song-files/${songFileId}`, { method: "DELETE" })).status,
  ).toBe(404);

  const ownerDownload = await owner.fetch(`/song-files/${songFileId}`);
  expect(ownerDownload.status).toBe(200);
  expect(ownerDownload.headers.get("Content-Type")).toBe("application/pdf");
  expect(ownerDownload.headers.get("X-Content-Type-Options")).toBe("nosniff");
  expect(ownerDownload.headers.get("Cache-Control")).toBe("private, no-store");
  expect(ownerDownload.headers.get("Content-Disposition")).toContain("score - draft.pdf");
  expect(new Uint8Array(await ownerDownload.arrayBuffer())).toEqual(
    new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]),
  );

  const storageId = await t.run(async (ctx) => {
    const rows = await ctx.db
      .query("songFiles")
      .withIndex("by_userId_and_songId_and_createdAt", (query) =>
        query.eq("userId", ownerUser.id).eq("songId", songId),
      )
      .take(1);
    return rows[0]?.storageId ?? null;
  });
  // The preceding public list deliberately has no storage ID, so inspect the
  // private table only inside this backend contract test.
  expect(storageId).not.toBeNull();

  expect(
    (await owner.fetch(`/song-files/${songFileId}`, { method: "DELETE" })).status,
  ).toBe(204);
  await expect(owner.query(api.songFiles.listMine, { songId })).resolves.toEqual([]);
  if (!storageId) throw new Error("Expected a stored Song File");
  await expect(t.run((ctx) => ctx.storage.get(storageId))).resolves.toBeNull();
});

test("rejects unsupported, mismatched, and oversized Song File uploads", async () => {
  const t = convexTest({ schema, modules });
  const owner = t.withIdentity(identity("file-validation-owner"));
  await owner.mutation(api.users.ensureCurrent, {});
  const songId = await owner.mutation(api.songs.create, {
    requestId: "song-file-validation-song",
    shared: songInput("Stella by Starlight"),
    writers: [],
  });

  const unsupported = await upload(
    owner,
    songId,
    new Blob(["<svg></svg>"], { type: "image/svg+xml" }),
    "score.svg",
  );
  expect(unsupported.status).toBe(415);

  const mismatched = await upload(
    owner,
    songId,
    new Blob(["not a PDF"], { type: "application/pdf" }),
  );
  expect(mismatched.status).toBe(415);

  const oversized = await owner.fetch(`/song-files?songId=${songId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(15 * 1024 * 1024 + 1),
      "X-Song-File-Name": "too-large.pdf",
    },
    body: validPdf(),
  });
  expect(oversized.status).toBe(413);
  await expect(owner.query(api.songFiles.listMine, { songId })).resolves.toEqual([]);
});

test("rejects requests from a non-configured browser origin", async () => {
  const t = convexTest({ schema, modules });
  const owner = t.withIdentity(identity("cors-owner"));
  await owner.mutation(api.users.ensureCurrent, {});
  const songId = await owner.mutation(api.songs.create, {
    requestId: "song-file-cors-song",
    shared: songInput("Lush Life"),
    writers: [],
  });

  const response = await owner.fetch(`/song-files?songId=${songId}`, {
    method: "POST",
    headers: {
      Origin: "https://untrusted.example.test",
      "Content-Type": "application/pdf",
      "X-Song-File-Name": "score.pdf",
    },
    body: validPdf(),
  });
  expect(response.status).toBe(403);
});
