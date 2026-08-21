/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as artists from "../artists.js";
import type * as migrations from "../migrations.js";
import type * as model_artists from "../model/artists.js";
import type * as model_auth from "../model/auth.js";
import type * as model_recordings from "../model/recordings.js";
import type * as model_songs from "../model/songs.js";
import type * as recordings from "../recordings.js";
import type * as songs from "../songs.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  artists: typeof artists;
  migrations: typeof migrations;
  "model/artists": typeof model_artists;
  "model/auth": typeof model_auth;
  "model/recordings": typeof model_recordings;
  "model/songs": typeof model_songs;
  recordings: typeof recordings;
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
