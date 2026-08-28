import { v } from "convex/values";

export const artistMembershipValidator = v.object({
  musicbrainz_artist_id: v.string(),
  name: v.string(),
  relationship: v.union(v.literal("member"), v.literal("group")),
  begin: v.union(v.string(), v.null()),
  end: v.union(v.string(), v.null()),
  ended: v.boolean(),
  attributes: v.array(v.string()),
});

export const artistMembershipViewValidator = artistMembershipValidator.extend({
  artist_id: v.union(v.id("artists"), v.null()),
});
