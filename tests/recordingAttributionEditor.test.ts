import assert from "node:assert/strict";
import test from "node:test";
import {
  addAttributionPart,
  changeManualArtistName,
  confirmProviderUnmatchedArtist,
  moveAttributionPart,
  removeAttributionPart,
  selectExistingArtist,
} from "../src/utils/recordingAttributionEditor.ts";
import { attributionsToSavePayload } from "../src/utils/recordingAttributions.ts";

test("adds an explicit provider-unmatched Artist with a matching credited-as default", () => {
  assert.deepEqual(addAttributionPart([], "Cécile McLorin Salvant"), [
    {
      artistId: null,
      name: "Cécile McLorin Salvant",
      creditedAs: "Cécile McLorin Salvant",
      joinPhrase: "",
      kind: null,
      musicbrainzArtistId: null,
      providerUnmatchedConfirmed: false,
    },
  ]);
});

test("keeps a credited-as override when the provider-unmatched Artist name changes", () => {
  const [part] = addAttributionPart([], "Buster Williams");
  const overridden = { ...part, creditedAs: "Buster" };

  assert.deepEqual(changeManualArtistName(overridden, "Charles Anthony Williams"), {
    artistId: null,
    name: "Charles Anthony Williams",
    creditedAs: "Buster",
    joinPhrase: "",
    kind: null,
    musicbrainzArtistId: null,
    providerUnmatchedConfirmed: false,
  });
});

test("reuses an existing Artist while defaulting credited-as and preserving join phrasing", () => {
  const [part] = addAttributionPart([], "");

  assert.deepEqual(
    selectExistingArtist({ ...part, joinPhrase: " with " }, {
      id: "artist-1",
      name: "Stan Getz",
      kind: "person",
      musicbrainz_artist_id: "stan-getz-mbid",
    }),
    {
      artistId: "artist-1",
      name: "Stan Getz",
      creditedAs: "Stan Getz",
      joinPhrase: " with ",
      kind: "person",
      musicbrainzArtistId: "stan-getz-mbid",
      providerUnmatchedConfirmed: false,
    },
  );
});

test("requires deliberate confirmation before serializing a provider-unmatched Artist", () => {
  const [unresolved] = addAttributionPart([], "Local Session Ensemble");

  assert.throws(
    () => attributionsToSavePayload([unresolved]),
    /Select an existing Artist or create a provider-unmatched Artist/,
  );
  assert.deepEqual(
    attributionsToSavePayload([confirmProviderUnmatchedArtist(unresolved)]),
    [{
      type: "provider_unmatched",
      name: "Local Session Ensemble",
      credited_as: "Local Session Ensemble",
      join_phrase: "",
      kind: null,
    }],
  );
});

test("removes and reorders Attribution parts without collapsing repeated Artists or join phrases", () => {
  const first = selectExistingArtist(addAttributionPart([], "")[0], {
    id: "artist-1",
    name: "Ella Fitzgerald",
    kind: "person",
    musicbrainz_artist_id: "ella-mbid",
  });
  const repeated = { ...first, creditedAs: "Ella", joinPhrase: " & " };
  const guest = addAttributionPart([], "Louis Armstrong")[0];
  const parts = [first, repeated, guest];

  assert.deepEqual(moveAttributionPart(parts, 2, 0), [guest, first, repeated]);
  assert.deepEqual(removeAttributionPart(parts, 1), [first, guest]);
});
