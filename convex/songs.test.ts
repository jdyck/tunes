/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const identity = (subject: string, email: string) => ({
  subject,
  tokenIdentifier: `https://clerk.example.test|${subject}`,
  issuer: "https://clerk.example.test",
  email,
});

const sharedSong = (name: string) => ({
  name,
  year: 1930,
  wikipediaExtract: null,
  wikipediaUrl: null,
  musicbrainzWorkId: null,
  workDateStart: null,
  workDateEnd: null,
});

const writers = [
  {
    artistId: null,
    canonicalName: "Example Writer",
    creditedAs: "Example Writer",
    role: "composer" as const,
    artistKind: "person" as const,
    musicbrainzArtistId: "mbid-example-writer",
  },
];

test("requires Clerk identity and initializes one application User idempotently", async () => {
  const t = convexTest({ schema, modules });

  await expect(t.mutation(api.users.ensureCurrent, {})).rejects.toThrow(
    "Unauthenticated",
  );

  const owner = t.withIdentity(identity("owner", "owner@example.test"));
  const firstId = await owner.mutation(api.users.ensureCurrent, {});
  const secondId = await owner.mutation(api.users.ensureCurrent, {});

  expect(secondId).toBe(firstId);
  await expect(owner.query(api.users.current, {})).resolves.toMatchObject({
    id: firstId,
    email: "owner@example.test",
    role: "user",
  });
});

test("keeps private Song membership isolated while sharing discoverable identity", async () => {
  const t = convexTest({ schema, modules });
  const owner = t.withIdentity(identity("owner", "owner@example.test"));
  const other = t.withIdentity(identity("other", "other@example.test"));

  await owner.mutation(api.users.ensureCurrent, {});
  await other.mutation(api.users.ensureCurrent, {});
  const songId = await owner.mutation(api.songs.create, {
    requestId: "owner-create-1",
    shared: sharedSong("Body and Soul"),
    writers,
  });

  await expect(other.query(api.songs.getMine, { songId })).rejects.toThrow(
    "Song not found in your list",
  );
  await expect(other.query(api.songs.listMine, {})).resolves.toEqual([]);
  await expect(
    other.mutation(api.songs.setFavorite, { songId, favorite: true }),
  ).rejects.toThrow("Song not found in your list");

  await t.mutation(internal.users.setRole, {
    clerkSubject: "owner",
    role: "admin",
  });
  await owner.mutation(api.songs.setDiscoverability, {
    songId,
    isDiscoverable: true,
  });

  const discovery = await other.query(api.songs.searchDiscoverable, {
    term: "Body",
  });
  expect(discovery).toHaveLength(1);
  expect(discovery[0]).toMatchObject({
    id: songId,
    name: "Body and Soul",
  });

  await other.mutation(api.songs.addDiscoverable, { songId });
  await other.mutation(api.songs.update, {
    songId,
    privateData: {
      notes: "Other User's private note",
      displayTitle: "My Body and Soul",
      favorite: true,
      tags: ["Ballad"],
    },
    shared: null,
    writers: null,
  });

  const ownerView = await owner.query(api.songs.getMine, { songId });
  const otherView = await other.query(api.songs.getMine, { songId });
  expect(ownerView.song.user_data.notes).toBeNull();
  expect(ownerView.song.user_data.favorite).toBe(false);
  expect(otherView.song.user_data).toMatchObject({
    notes: "Other User's private note",
    display_title: "My Body and Soul",
    favorite: true,
    tags: ["Ballad"],
  });
});

test("enforces Site Admin authority and rolls back forbidden shared edits", async () => {
  const t = convexTest({ schema, modules });
  const owner = t.withIdentity(identity("owner", "owner@example.test"));
  const other = t.withIdentity(identity("other", "other@example.test"));

  await owner.mutation(api.users.ensureCurrent, {});
  await other.mutation(api.users.ensureCurrent, {});
  const songId = await owner.mutation(api.songs.create, {
    requestId: "owner-create-2",
    shared: sharedSong("Stardust"),
    writers,
  });

  await expect(
    owner.mutation(api.songs.setDiscoverability, {
      songId,
      isDiscoverable: true,
    }),
  ).rejects.toThrow("Forbidden");

  await t.mutation(internal.users.setRole, {
    clerkSubject: "owner",
    role: "admin",
  });
  await owner.mutation(api.songs.setDiscoverability, {
    songId,
    isDiscoverable: true,
  });
  await other.mutation(api.songs.addDiscoverable, { songId });

  await expect(
    other.mutation(api.songs.update, {
      songId,
      privateData: {
        notes: "This must roll back",
        displayTitle: null,
        favorite: true,
        tags: null,
      },
      shared: sharedSong("Changed by another User"),
      writers,
    }),
  ).rejects.toThrow("Forbidden");

  const afterRejectedUpdate = await other.query(api.songs.getMine, { songId });
  expect(afterRejectedUpdate.song.name).toBe("Stardust");
  expect(afterRejectedUpdate.song.user_data.notes).toBeNull();
  expect(afterRejectedUpdate.song.user_data.favorite).toBe(false);
});
