import { mutation, query } from "./_generated/server";
import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";
import { getCurrentUser, requireAdmin } from "./model/auth";
import {
  artistMembershipValidator,
  artistMembershipViewValidator,
} from "./model/artistMemberships";
import {
  isArtistMembershipCacheFresh,
  validateArtistMemberships,
} from "../src/utils/artistMemberships";
import {
  artistIdentityViewValidator,
  artistSummaryViewValidator,
  toArtistIdentityView,
} from "./model/artists";
import { ownedSongViewValidator, toOwnedSongView } from "./model/songs";
import {
  savedRecordingViewValidator,
  toSavedRecordingView,
} from "./model/recordings";
import { recordingRelationshipReasonValidator } from "./model/artistRepertoire";
import {
  loadLegacyArtistRecordings,
  loadLegacyArtistSongs,
  loadLegacyArtistSummaries,
} from "./model/legacyArtistRepertoire";

const nullableString = v.union(v.string(), v.null());
const artistRecordingViewValidator = savedRecordingViewValidator.extend({
  relationship_reasons: v.array(recordingRelationshipReasonValidator),
  song_title: v.string(),
});

const requirePageSizeAtMost = (numItems: number, maximum: number) => {
  if (!Number.isInteger(numItems) || numItems < 1 || numItems > maximum) {
    throw new Error(`Page size must be between 1 and ${maximum}`);
  }
};

const completedPage = <Value>(page: Value[]) => ({
  page,
  isDone: true,
  continueCursor: "",
});

export const listMine = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(artistSummaryViewValidator),
  handler: async (ctx, { paginationOpts }) => {
    requirePageSizeAtMost(paginationOpts.numItems, 100);
    const user = await getCurrentUser(ctx);
    if (!user.artistRepertoireProjectedAt) {
      if (paginationOpts.cursor !== null) {
        throw new Error(
          "Legacy Artist browsing accepts only an initial cursor",
        );
      }
      return completedPage(await loadLegacyArtistSummaries(ctx, user._id));
    }
    const page = await ctx.db
      .query("artistRepertoireSummaries")
      .withIndex("by_userId", (index) => index.eq("userId", user._id))
      .paginate(paginationOpts);
    return {
      ...page,
      page: await Promise.all(
        page.page.map(async (summary) => {
          const artist = await ctx.db.get(summary.artistId);
          if (!artist) {
            throw new Error(
              "Artist repertoire summary references a missing Artist",
            );
          }
          return {
            id: artist._id,
            name: artist.name,
            kind: artist.kind,
            songCount: summary.songCount,
            recordingCount: summary.recordingCount,
          };
        }),
      ),
    };
  },
});

export const getIdentity = query({
  args: { artistId: v.id("artists") },
  returns: v.union(artistIdentityViewValidator, v.null()),
  handler: async (ctx, { artistId }) => {
    await getCurrentUser(ctx);
    const artist = await ctx.db.get(artistId);
    return artist ? toArtistIdentityView(artist) : null;
  },
});

export const search = query({
  args: { query: v.string() },
  returns: v.array(artistIdentityViewValidator),
  handler: async (ctx, { query: searchQuery }) => {
    await getCurrentUser(ctx);
    const term = searchQuery.trim();
    if (!term) return [];
    const artists = await ctx.db
      .query("artists")
      .withSearchIndex("search_name", (index) => index.search("name", term))
      .take(25);
    return artists.map(toArtistIdentityView);
  },
});

export const getMine = query({
  args: { artistId: v.id("artists") },
  returns: v.union(
    v.object({
      artist: artistIdentityViewValidator,
      user_data: v.union(
        v.object({
          user_id: v.id("users"),
          artist_id: v.id("artists"),
          notes: nullableString,
          tags: v.union(v.array(v.string()), v.null()),
        }),
        v.null(),
      ),
      song_count: v.number(),
      recording_count: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, { artistId }) => {
    const user = await getCurrentUser(ctx);
    const artist = await ctx.db.get(artistId);
    if (!artist) return null;

    const legacyCounts = !user.artistRepertoireProjectedAt
      ? await Promise.all([
          loadLegacyArtistSongs(ctx, user._id, artistId),
          loadLegacyArtistRecordings(ctx, user._id, artistId),
        ])
      : null;

    const [privateData, summary] = await Promise.all([
      ctx.db
        .query("artistUserData")
        .withIndex("by_userId_and_artistId", (index) =>
          index.eq("userId", user._id).eq("artistId", artistId),
        )
        .unique(),
      ctx.db
        .query("artistRepertoireSummaries")
        .withIndex("by_userId_and_artistId", (index) =>
          index.eq("userId", user._id).eq("artistId", artistId),
        )
        .unique(),
    ]);

    return {
      artist: toArtistIdentityView(artist),
      user_data: privateData
        ? {
            user_id: privateData.userId,
            artist_id: privateData.artistId,
            notes: privateData.notes,
            tags: privateData.tags,
          }
        : null,
      song_count: legacyCounts?.[0].length ?? summary?.songCount ?? 0,
      recording_count: legacyCounts?.[1].length ?? summary?.recordingCount ?? 0,
    };
  },
});

export const listSongsMine = query({
  args: {
    artistId: v.id("artists"),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(ownedSongViewValidator),
  handler: async (ctx, { artistId, paginationOpts }) => {
    requirePageSizeAtMost(paginationOpts.numItems, 50);
    const user = await getCurrentUser(ctx);
    if (!(await ctx.db.get(artistId))) throw new Error("Artist not found");
    if (!user.artistRepertoireProjectedAt) {
      if (paginationOpts.cursor !== null) {
        throw new Error("Legacy Artist detail accepts only an initial cursor");
      }
      return completedPage(
        await loadLegacyArtistSongs(ctx, user._id, artistId),
      );
    }
    const page = await ctx.db
      .query("artistSongRepertoireEntries")
      .withIndex("by_userId_and_artistId", (index) =>
        index.eq("userId", user._id).eq("artistId", artistId),
      )
      .paginate(paginationOpts);
    return {
      ...page,
      page: await Promise.all(
        page.page.map(async (entry) => {
          const [song, membership] = await Promise.all([
            ctx.db.get(entry.songId),
            ctx.db
              .query("songUserData")
              .withIndex("by_userId_and_songId", (index) =>
                index.eq("userId", user._id).eq("songId", entry.songId),
              )
              .unique(),
          ]);
          if (!song || !membership) {
            throw new Error("Artist Song entry references an unavailable Song");
          }
          return toOwnedSongView(ctx, song, membership);
        }),
      ),
    };
  },
});

export const listRecordingsMine = query({
  args: {
    artistId: v.id("artists"),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(artistRecordingViewValidator),
  handler: async (ctx, { artistId, paginationOpts }) => {
    requirePageSizeAtMost(paginationOpts.numItems, 50);
    const user = await getCurrentUser(ctx);
    if (!(await ctx.db.get(artistId))) throw new Error("Artist not found");
    if (!user.artistRepertoireProjectedAt) {
      if (paginationOpts.cursor !== null) {
        throw new Error("Legacy Artist detail accepts only an initial cursor");
      }
      return completedPage(
        await loadLegacyArtistRecordings(ctx, user._id, artistId),
      );
    }
    const page = await ctx.db
      .query("artistRecordingRepertoireEntries")
      .withIndex("by_userId_and_artistId", (index) =>
        index.eq("userId", user._id).eq("artistId", artistId),
      )
      .paginate(paginationOpts);
    return {
      ...page,
      page: await Promise.all(
        page.page.map(async (entry) => {
          const [recording, membership, song, songMembership] =
            await Promise.all([
              ctx.db.get(entry.recordingId),
              ctx.db
                .query("userRecordingData")
                .withIndex("by_userId_and_recordingId", (index) =>
                  index
                    .eq("userId", user._id)
                    .eq("recordingId", entry.recordingId),
                )
                .unique(),
              ctx.db.get(entry.songId),
              ctx.db
                .query("songUserData")
                .withIndex("by_userId_and_songId", (index) =>
                  index.eq("userId", user._id).eq("songId", entry.songId),
                )
                .unique(),
            ]);
          if (
            !recording ||
            recording.songId !== entry.songId ||
            !membership ||
            !song ||
            !songMembership
          ) {
            throw new Error(
              "Artist Recording entry references an unavailable source",
            );
          }
          return {
            ...(await toSavedRecordingView(ctx, recording, membership)),
            relationship_reasons: entry.relationshipReasons,
            song_title: songMembership.displayTitle || song.name,
          };
        }),
      ),
    };
  },
});

export const getMemberships = query({
  args: { artistId: v.id("artists") },
  returns: v.union(
    v.object({
      musicbrainz_artist_id: nullableString,
      fetched_at: nullableString,
      memberships: v.array(artistMembershipViewValidator),
    }),
    v.null(),
  ),
  handler: async (ctx, { artistId }) => {
    await getCurrentUser(ctx);
    const artist = await ctx.db.get(artistId);
    if (!artist) return null;
    const lookup = await ctx.db
      .query("artistMembershipLookups")
      .withIndex("by_artistId", (index) => index.eq("artistId", artistId))
      .unique();
    if (!lookup || lookup.musicbrainzArtistId !== artist.musicbrainzArtistId) {
      return {
        musicbrainz_artist_id: artist.musicbrainzArtistId,
        fetched_at: null,
        memberships: [],
      };
    }

    const ids = [
      ...new Set(lookup.memberships.map((item) => item.musicbrainz_artist_id)),
    ];
    const localArtists = new Map(
      await Promise.all(
        ids.map(async (mbid) => {
          const localArtist = await ctx.db
            .query("artists")
            .withIndex("by_musicbrainzArtistId", (index) =>
              index.eq("musicbrainzArtistId", mbid),
            )
            .unique();
          return [mbid, localArtist?._id ?? null] as const;
        }),
      ),
    );
    return {
      musicbrainz_artist_id: artist.musicbrainzArtistId,
      fetched_at: lookup.fetchedAt,
      memberships: lookup.memberships.map((item) => ({
        ...item,
        // Resolve at read time, so newly added Artists become links without a provider refresh.
        artist_id: localArtists.get(item.musicbrainz_artist_id) ?? null,
      })),
    };
  },
});

export const cacheMemberships = mutation({
  args: {
    artistId: v.id("artists"),
    musicbrainzArtistId: v.string(),
    memberships: v.array(artistMembershipValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Same trusted-stage writer policy as Artist images; clients cannot freely edit shared facts.
    await requireAdmin(ctx);
    const artist = await ctx.db.get(args.artistId);
    if (!artist) throw new Error("Artist not found");
    if (artist.musicbrainzArtistId !== args.musicbrainzArtistId) {
      throw new Error(
        "Artist MusicBrainz identity changed during membership lookup",
      );
    }
    validateArtistMemberships(args.memberships);
    const existing = await ctx.db
      .query("artistMembershipLookups")
      .withIndex("by_artistId", (index) => index.eq("artistId", args.artistId))
      .unique();
    if (
      existing?.musicbrainzArtistId === args.musicbrainzArtistId &&
      isArtistMembershipCacheFresh(existing.fetchedAt)
    )
      return null;

    const snapshot = {
      artistId: args.artistId,
      musicbrainzArtistId: args.musicbrainzArtistId,
      fetchedAt: new Date().toISOString(),
      memberships: args.memberships,
    };
    if (existing) await ctx.db.replace(existing._id, snapshot);
    else await ctx.db.insert("artistMembershipLookups", snapshot);
    return null;
  },
});

export const cacheImage = mutation({
  args: {
    artistId: v.id("artists"),
    wikidataId: nullableString,
    imageUrl: nullableString,
    sourceUrl: nullableString,
    license: nullableString,
  },
  returns: artistIdentityViewValidator,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const artist = await ctx.db.get(args.artistId);
    if (!artist) throw new Error("Artist not found");
    if (artist.imageLookupCompletedAt) return toArtistIdentityView(artist);

    const wikidataId = args.wikidataId?.trim() || null;
    const imageUrl = args.imageUrl?.trim() || null;
    const sourceUrl = args.sourceUrl?.trim() || null;
    const license = args.license?.trim() || null;
    if (wikidataId && !/^Q\d+$/.test(wikidataId)) {
      throw new Error("Invalid Wikidata Artist ID");
    }
    if (imageUrl && !imageUrl.startsWith("https://upload.wikimedia.org/")) {
      throw new Error("Invalid Wikimedia image URL");
    }
    if (sourceUrl && !sourceUrl.startsWith("https://commons.wikimedia.org/")) {
      throw new Error("Invalid Wikimedia source URL");
    }
    if (imageUrl && !sourceUrl) {
      throw new Error("A cached Artist image requires its source URL");
    }

    const imageLookupCompletedAt = new Date().toISOString();
    await ctx.db.patch(artist._id, {
      wikidataId,
      imageUrl,
      imageSourceUrl: sourceUrl,
      imageLicense: license,
      imageLookupCompletedAt,
    });
    return toArtistIdentityView({
      ...artist,
      wikidataId,
      imageUrl,
      imageSourceUrl: sourceUrl,
      imageLicense: license,
      imageLookupCompletedAt,
    });
  },
});
