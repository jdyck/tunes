/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as artistRepertoire from "../artistRepertoire.js";
import type * as artists from "../artists.js";
import type * as devAgents from "../devAgents.js";
import type * as http from "../http.js";
import type * as migrations from "../migrations.js";
import type * as model_artistMemberships from "../model/artistMemberships.js";
import type * as model_artistRepertoire from "../model/artistRepertoire.js";
import type * as model_artists from "../model/artists.js";
import type * as model_auth from "../model/auth.js";
import type * as model_legacyArtistRepertoire from "../model/legacyArtistRepertoire.js";
import type * as model_recordings from "../model/recordings.js";
import type * as model_songFiles from "../model/songFiles.js";
import type * as model_songs from "../model/songs.js";
import type * as recordings from "../recordings.js";
import type * as songFiles from "../songFiles.js";
import type * as songs from "../songs.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  artistRepertoire: typeof artistRepertoire;
  artists: typeof artists;
  devAgents: typeof devAgents;
  http: typeof http;
  migrations: typeof migrations;
  "model/artistMemberships": typeof model_artistMemberships;
  "model/artistRepertoire": typeof model_artistRepertoire;
  "model/artists": typeof model_artists;
  "model/auth": typeof model_auth;
  "model/legacyArtistRepertoire": typeof model_legacyArtistRepertoire;
  "model/recordings": typeof model_recordings;
  "model/songFiles": typeof model_songFiles;
  "model/songs": typeof model_songs;
  recordings: typeof recordings;
  songFiles: typeof songFiles;
  songs: typeof songs;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  migrations: import("@convex-dev/migrations/_generated/component.js").ComponentApi<"migrations">;
};
