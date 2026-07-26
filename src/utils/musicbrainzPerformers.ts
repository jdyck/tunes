import type { RecordingPerformer } from "../lib/musicbrainz.ts";
import { decodeHtmlEntities } from "./htmlEntities.ts";

export interface MusicBrainzPerformerRelation {
  type: string;
  artist?: { id: string; name: string; type?: string | null };
  "target-credit"?: string;
}

const performerRelationTypes = new Set([
  "instrument",
  "vocal",
  "performer",
  "conductor",
  "orchestra",
]);

// Turns MusicBrainz artist relations into the recording's performer credits.
// An artist credited for several roles on one recording (e.g. guitar and
// vocals) yields one relation per role, all with the same artist id. The
// Recording ⇄ Artist model holds a single performer credit per artist, so we
// collapse to the first occurrence — a duplicate artist id would otherwise
// violate recording_artist_credits_identity_key on save.
export const musicBrainzRecordingPerformers = (
  relations: MusicBrainzPerformerRelation[]
): RecordingPerformer[] => {
  const performersById = new Map<string, RecordingPerformer>();

  for (const relation of relations) {
    if (!relation.artist || !performerRelationTypes.has(relation.type)) {
      continue;
    }
    if (performersById.has(relation.artist.id)) continue;
    performersById.set(relation.artist.id, {
      musicbrainzArtistId: relation.artist.id,
      name: decodeHtmlEntities(relation.artist.name),
      creditedAs: decodeHtmlEntities(
        relation["target-credit"] || relation.artist.name
      ),
      kind: relation.artist.type?.toLowerCase() ?? null,
    });
  }

  return [...performersById.values()];
};
