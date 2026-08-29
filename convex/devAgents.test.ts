/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { devAgentConfig } from "../src/utils/devAgentAccounts";
import { devAgentEnvironment } from "../tests/fixtures/devAgentEnvironment";

const { target, accounts } = devAgentConfig(devAgentEnvironment);

const modules = import.meta.glob("./**/*.ts");
const subjects = {
  userSubject: "user_agentUser",
  adminSubject: "user_agentAdmin",
};
const configureDev = () => {
  for (const [name, value] of Object.entries(devAgentEnvironment))
    vi.stubEnv(name, value);
  vi.stubEnv("CONVEX_CLOUD_URL", target.convexUrl);
  vi.stubEnv("CLERK_JWT_ISSUER_DOMAIN", target.clerkIssuer);
};
afterEach(() => vi.unstubAllEnvs());
const identity = (profile: "user" | "admin") => {
  const subject =
    profile === "user" ? subjects.userSubject : subjects.adminSubject;
  return {
    subject,
    issuer: target.clerkIssuer,
    tokenIdentifier: `${target.clerkIssuer}|${subject}`,
    email: accounts[profile].email,
  };
};

test("dev seeding is idempotent, preserves edited notes, and keeps fixture data private", async () => {
  configureDev();
  const t = convexTest({ schema, modules });
  expect(await t.mutation(internal.devAgents.seed, subjects)).toEqual({
    users: 2,
    demoSongs: 3,
    demoRecordings: 2,
  });
  const user = t.withIdentity(identity("user"));
  const admin = t.withIdentity(identity("admin"));
  expect(await user.query(api.users.current, {})).toMatchObject({
    role: "user",
  });
  expect(await admin.query(api.users.current, {})).toMatchObject({
    role: "admin",
  });
  const userSongs = await user.query(api.songs.listMine, {});
  const adminSongs = await admin.query(api.songs.listMine, {});
  expect(userSongs).toHaveLength(2);
  expect(adminSongs).toHaveLength(2);
  expect(
    userSongs.every(
      (song) => song.user_data.notes === "USER ONLY: private demo notes",
    ),
  ).toBe(true);
  expect(
    adminSongs.every(
      (song) => song.user_data.notes === "ADMIN ONLY: private demo notes",
    ),
  ).toBe(true);
  const privateSong = userSongs.find((song) => song.name.includes("private"))!;
  await expect(
    admin.query(api.songs.getMine, { songId: privateSong.id }),
  ).rejects.toThrow("Song not found in your list");
  await expect(
    user.mutation(api.songs.setDiscoverability, {
      songId: privateSong.id,
      isDiscoverable: true,
    }),
  ).rejects.toThrow("Forbidden");
  await user.mutation(api.songs.update, {
    songId: privateSong.id,
    shared: null,
    privateData: {
      notes: "Edited fixture note",
      displayTitle: null,
      favorite: false,
      tags: [],
    },
    writers: null,
  });
  for (const profile of ["user", "admin"] as const) {
    const { email: _email, ...claims } = identity(profile);
    const sessionWithoutEmail = t.withIdentity(claims);
    await sessionWithoutEmail.mutation(api.users.ensureCurrent, {});
    expect(
      await sessionWithoutEmail.query(api.users.current, {}),
    ).toMatchObject({ email: null, role: profile });
  }
  await t.mutation(internal.devAgents.seed, subjects);
  expect(
    (await user.query(api.songs.getMine, { songId: privateSong.id }))?.song
      .user_data.notes,
  ).toBe("Edited fixture note");
  const counts = await t.run(async (ctx) => ({
    users: (await ctx.db.query("users").take(10)).length,
    songs: (await ctx.db.query("songs").take(10)).length,
    recordings: (await ctx.db.query("recordings").take(10)).length,
    saved: (await ctx.db.query("userRecordingData").take(10)).length,
  }));
  expect(counts).toEqual({ users: 2, songs: 3, recordings: 2, saved: 4 });
});

test("seeder refuses other deployments and never promotes an unrelated User", async () => {
  const t = convexTest({ schema, modules });
  configureDev();
  vi.stubEnv("DEV_AGENT_ADMIN_EMAIL", undefined);
  await expect(t.mutation(internal.devAgents.seed, subjects)).rejects.toThrow(
    "Missing or invalid DEV_AGENT_ADMIN_EMAIL",
  );
  configureDev();
  vi.stubEnv("CONVEX_CLOUD_URL", "https://production.convex.cloud");
  await expect(t.mutation(internal.devAgents.seed, subjects)).rejects.toThrow(
    "pinned development",
  );
  configureDev();
  await expect(
    t.mutation(internal.devAgents.seed, {
      ...subjects,
      adminSubject: subjects.userSubject,
    }),
  ).rejects.toThrow("distinct");
  await t.run((ctx) =>
    ctx.db.insert("users", {
      clerkSubject: subjects.adminSubject,
      clerkTokenIdentifier: `${target.clerkIssuer}|${subjects.adminSubject}`,
      email: "owner@example.com",
      role: "user",
      legacySupabaseId: null,
    }),
  );
  await expect(t.mutation(internal.devAgents.seed, subjects)).rejects.toThrow(
    "unrelated application User",
  );
  expect(await t.run((ctx) => ctx.db.query("users").take(10))).toEqual([
    expect.objectContaining({ email: "owner@example.com", role: "user" }),
  ]);
  await t.run(async (ctx) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkSubject", (q) =>
        q.eq("clerkSubject", subjects.adminSubject),
      )
      .unique();
    await ctx.db.patch(existing!._id, { email: null });
  });
  await expect(t.mutation(internal.devAgents.seed, subjects)).rejects.toThrow(
    "unrelated application User",
  );
});

test("seeder accepts a pinned account email rotation without combining it with a role change", async () => {
  configureDev();
  const t = convexTest({ schema, modules });
  await t.mutation(internal.devAgents.seed, subjects);

  const rotatedEmail = "rotated-agent-admin@example.invalid";
  vi.stubEnv("DEV_AGENT_ADMIN_EMAIL", rotatedEmail);
  await t.mutation(internal.devAgents.seed, subjects);
  expect(
    await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("by_clerkSubject", (q) =>
          q.eq("clerkSubject", subjects.adminSubject),
        )
        .unique(),
    ),
  ).toMatchObject({ email: rotatedEmail, role: "admin" });

  await t.run(async (ctx) => {
    const admin = await ctx.db
      .query("users")
      .withIndex("by_clerkSubject", (q) =>
        q.eq("clerkSubject", subjects.adminSubject),
      )
      .unique();
    await ctx.db.patch(admin!._id, { role: "user" });
  });
  vi.stubEnv("DEV_AGENT_ADMIN_EMAIL", "second-rotation@example.invalid");
  await expect(t.mutation(internal.devAgents.seed, subjects)).rejects.toThrow(
    "unrelated application User",
  );
});
