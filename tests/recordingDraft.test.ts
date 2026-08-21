import assert from "node:assert/strict";
import test from "node:test";
import type { SavedRecording } from "../src/types/types.ts";
import {
  recordingEditorStateAfterSave,
  recordingDraftAfterMusicBrainzLookup,
  recordingDraftIsDirty,
  recordingDraftToPayload,
  recordingDraftWithoutMusicBrainzMatch,
  recordingDraftWithResolvedMatch,
  recordingToEditorState,
} from "../src/utils/recordingDraft.ts";

const recordingFixture = (): SavedRecording => ({
  id: "recording-1",
  song_id: "song-1",
  name: "You &amp; the Night &amp; the Music",
  kind: "released",
  artist: "Bill &amp; Jane",
  artist_attribution_fallback: "Bill &amp; Jane",
  album: null,
  year: "1958",
  duration: "3:42",
  musicbrainz_recording_id: "recording-mbid",
  musicbrainz_release_id: "release-mbid",
  recording_date_start: "1958-05",
  recording_date_end: "1958-06",
  recording_location: "Chicago",
  release_group_id: "release-group-1",
  release_groups: {
    id: "release-group-1",
    title: "Album &amp; Context",
    musicbrainz_release_group_id: "release-group-mbid",
  },
  recording_artist_credits: [
    {
      recording_id: "recording-1",
      artist_id: "artist-1",
      role: "performer",
      credited_as: "Bill & Jane",
      sort_order: 0,
      artists: {
        id: "artist-1",
        name: "Bill & Jane",
        kind: "group",
        musicbrainz_artist_id: "artist-mbid",
      },
    },
  ],
  recording_artist_attributions: [
    {
      recording_id: "recording-1",
      artist_id: "artist-1",
      credited_as: "Bill & Jane",
      join_phrase: "",
      sort_order: 0,
      artists: {
        id: "artist-1",
        name: "Bill & Jane",
        kind: "group",
        musicbrainz_artist_id: "artist-mbid",
      },
    },
  ],
  user_data: {
    user_id: "user-1",
    recording_id: "recording-1",
    notes: "Practice the bridge",
    rating: 4,
    sort_order: 2,
    tags: ["Ballad", "Trio"],
    key: "E-flat major",
    tempo: "96",
  },
  youtube_items: [],
});

test("creates one Recording draft while preserving the loaded save baseline", () => {
  const state = recordingToEditorState(recordingFixture());

  assert.equal(state.draft.name, "You & the Night & the Music");
  assert.equal(state.draft.artist, "Bill & Jane");
  assert.equal(state.draft.album, "Album & Context");
  assert.equal(state.baseline.name, "You &amp; the Night &amp; the Music");
  assert.equal(state.draft.attribution[0]?.artistId, "artist-1");
  assert.equal(recordingDraftIsDirty(state), true);
});

test("maps the complete Recording draft to the presence-aware RPC payload", () => {
  const recording = recordingFixture();
  const { draft } = recordingToEditorState(recording);

  assert.deepEqual(recordingDraftToPayload(recording, draft), {
    shared: {
      name: "You & the Night & the Music",
      kind: "released",
      artist: "Bill & Jane",
      album: "Album & Context",
      year: "1958",
      duration: "3:42",
      musicbrainz_recording_id: "recording-mbid",
      musicbrainz_release_id: "release-mbid",
      recording_date_start: "1958-05",
      recording_date_end: "1958-06",
      recording_location: "Chicago",
      release_group: {
        title: "Album &amp; Context",
        musicbrainz_release_group_id: "release-group-mbid",
      },
      attribution: [
        {
          type: "existing",
          artist_id: "artist-1",
          credited_as: "Bill & Jane",
          join_phrase: "",
        },
      ],
      performers: [
        {
          name: "Bill & Jane",
          credited_as: "Bill & Jane",
          kind: "group",
          musicbrainz_artist_id: "artist-mbid",
        },
      ],
    },
    private: {
      key: "E-flat major",
      tempo: "96",
      notes: "Practice the bridge",
      rating: 4,
      sort_order: 2,
      tags: ["Ballad", "Trio"],
    },
  });
});

test("serializes cleared optional fields explicitly", () => {
  const recording = recordingFixture();
  const state = recordingToEditorState(recording);
  const payload = recordingDraftToPayload(recording, {
    ...state.draft,
    artist: "",
    album: "",
    year: "",
    duration: "",
    recordingDateStart: "",
    recordingDateEnd: "",
    recordingLocation: "",
    key: "",
    tempo: "",
    notes: "",
    tags: "",
    musicbrainzRecordingId: null,
    musicbrainzReleaseId: null,
    releaseGroup: null,
    attribution: [],
    performers: [],
  });

  assert.equal(payload.shared.artist, null);
  assert.equal(payload.shared.release_group, null);
  assert.deepEqual(payload.shared.attribution, []);
  assert.deepEqual(payload.shared.performers, []);
  assert.equal(payload.private.notes, null);
  assert.deepEqual(payload.private.tags, []);
});

test("keeps Attribution Fallback editable when structured Attribution is cleared", () => {
  const recording = recordingFixture();
  const { draft } = recordingToEditorState(recording);

  assert.equal(draft.artist, "Bill & Jane");
  const payload = recordingDraftToPayload(recording, { ...draft, attribution: [] });
  assert.equal(payload.shared.artist, "Bill & Jane");
  assert.deepEqual(payload.shared.attribution, []);
});

test("unlinking MusicBrainz clears source-only Personnel but retains Attribution", () => {
  const { draft } = recordingToEditorState(recordingFixture());
  const unlinked = recordingDraftWithoutMusicBrainzMatch(draft);

  assert.equal(unlinked.musicbrainzRecordingId, null);
  assert.equal(unlinked.musicbrainzReleaseId, null);
  assert.equal(unlinked.releaseGroup, null);
  assert.deepEqual(unlinked.performers, []);
  assert.deepEqual(unlinked.attribution, draft.attribution);
  assert.equal(unlinked.artist, draft.artist);
});

test("a resolved MusicBrainz match replaces the complete Attribution draft only on success", () => {
  const { draft } = recordingToEditorState(recordingFixture());
  const matched = recordingDraftWithResolvedMatch(draft, {
    recordingId: "new-recording-mbid",
    title: "You and the Night and the Music",
    artistCredit: "Ella Fitzgerald with Louis Armstrong",
    duration: "3:44",
    recordingDateStart: null,
    recordingDateEnd: null,
    recordingLocation: null,
    attribution: [
      {
        artistId: null,
        musicbrainzArtistId: "ella-mbid",
        providerUnmatchedConfirmed: false,
        name: "Ella Fitzgerald",
        creditedAs: "Ella Fitzgerald",
        joinPhrase: " with ",
        kind: "person",
      },
      {
        artistId: null,
        musicbrainzArtistId: "louis-mbid",
        providerUnmatchedConfirmed: false,
        name: "Louis Armstrong",
        creditedAs: "Louis Armstrong",
        joinPhrase: "",
        kind: "person",
      },
    ],
    performers: [],
    releaseGroup: null,
    representativeReleaseId: null,
  });

  assert.equal(matched.artist, draft.artist);
  assert.deepEqual(
    matched.attribution.map((part) => part.joinPhrase),
    [" with ", ""],
  );
  assert.equal(matched.musicbrainzRecordingId, "new-recording-mbid");
});

test("a failed MusicBrainz lookup preserves the current Attribution draft", () => {
  const { draft } = recordingToEditorState(recordingFixture());

  assert.equal(recordingDraftAfterMusicBrainzLookup(draft, null), draft);
});

test("rehydrates saved canonical Artist IDs while preserving newer in-flight edits", () => {
  const initial = recordingToEditorState(recordingFixture());
  const current = {
    baseline: initial.baseline,
    draft: { ...initial.draft, notes: "Typed while saving" },
  };

  const afterSave = recordingEditorStateAfterSave(
    current,
    recordingFixture(),
    false,
  );

  assert.equal(afterSave.baseline.notes, "Practice the bridge");
  assert.equal(afterSave.draft.notes, "Typed while saving");
  assert.equal(recordingDraftIsDirty(afterSave), true);
  assert.equal(
    recordingEditorStateAfterSave(initial, recordingFixture(), true)
      .draft.attribution[0]?.artistId,
    "artist-1",
  );
});
