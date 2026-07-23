# MusicBrainz metadata and matching

MusicBrainz remains the metadata backbone. The app currently reaches it through one large module, exposes a provider-shaped result directly to components, and persists whichever Release happened to win a thin search heuristic. That produces plausible-looking but incorrect metadata and makes it hard to tell which MusicBrainz entity supplies each app field.

This document defines the entity mapping, calls, normalized response, storage boundary, and implementation order. Matching stays user-confirmed: the app proposes and explains; the user chooses.

## Entity mapping

| Standards entity/concept | MusicBrainz entity | Stored provider mapping |
| --- | --- | --- |
| Song (composition) | Work | `songs.musicbrainz_work_id` |
| Recording (specific recorded performance/version) | Recording | `recordings.musicbrainz_recording_id` |
| Release Group (master-level publication concept) | Release Group | planned provider ID on shared `release_groups` |
| Representative edition for source inspection | Release | existing `recordings.musicbrainz_release_id` |
| Writer, credited act, or selected performer | Artist (Person, Group, Orchestra, etc.) | future MusicBrainz identity on shared `artists` |

This distinction is the center of the design. A Release MBID must never stand in for Release Group identity; it is an edition-level pointer for a future detail view. Cover art should use the Cover Art Archive's Release Group endpoint, which already chooses representative art across editions. The current `recordings.album` snapshot is transitional. [ADR-0008](../adr/0008-provider-neutral-music-entities-and-user-data.md) settles the first-class Release Group and Artist boundaries plus separate Original Release and Primary Release relationships.

## What the known bad match proves

The regression fixture is "But Beautiful" by Nat King Cole:

- Work `10f9d66d-700a-3267-9551-2938a219ebf9` currently has 306 Recording relationships.
- An exact title/artist Recording search returns several Nat King Cole entities. More than one is linked to that Work, so Work membership alone does not eliminate duplicates.
- Recording `c5564b36-9155-4bd6-b2db-6698d702936a` has the correct `1958-05` performance relationship but appears only on later Releases in the search/lookup data.
- Recording `f2959512-37dd-4058-8937-97c77620bca8` has the same performance date and points to a 1958 official Release of Release Group `4c572b9f-bf8f-3238-a0c2-8185862ca5fa` (*The Very Thought of You*).

Therefore the ranking evidence is a combination: title/artist, duration, exact Work relationship, relationship date, and the earliest credible Release containing the candidate. "Work-aware" is a strong signal, not a complete algorithm. When the inexpensive evidence leaves multiple plausible candidates, the app preserves that ambiguity until the user asks it to compare fuller Release histories.

## Calls

All calls stay server-side, pass through the shared [transport boundary](#transport-boundary), and return normalized Standards data rather than raw MusicBrainz JSON to components.

### 1. Find and resolve a Song's Work

Search while adding/changing a Song:

```text
GET /ws/2/work?query=work:"{title}"&fmt=json&limit=15
```

Resolve a selected Work for ordinary Song sync:

```text
GET /ws/2/work/{workId}?inc=artist-rels+work-rels+url-rels&fmt=json
```

Consume:

- Work `id`, `title`, and `disambiguation`;
- `composer`, `lyricist`, and generic `writer` Artist relationships, including Artist MBID/name/type and relationship dates;
- parent Work relationships (`parts`, and where useful `included works`) as candidates for the editable "Part of" field;
- a Wikidata URL relationship for the existing Wikipedia flow.

Do not include `recording-rels` in ordinary Song sync. A popular standard can have hundreds of them, and the current code downloads that large list even when it only needs writers and a Wikidata ID.

Song year remains a best-effort approximation of year written. Use the earliest date on a composer/lyricist/writer relationship; otherwise leave it null. Relationship dates are often absent, so sparse coverage and a null year are expected outcomes, not sync failures. Never substitute a performance, Release, or publisher date merely to improve coverage: all describe something later or different from writing.

### 2. Build Recording candidates

First, perform the narrow text search already supported by the UI:

```text
GET /ws/2/recording?query=recording:"{song title}" AND artist:"{credited artist}"&fmt=json&limit=25
```

Consume the Recording MBID, title, artist credit, duration, MusicBrainz score, first-release date, and the compact Release/Release Group summaries returned by search. The first-release date and Release summaries are provisional release context only: never store the former as performance date, and never let either resolve an otherwise ambiguous candidate. They cannot establish that the best or earliest Release path has been seen.

When the Song has a Work MBID, also fetch its Recording relationship index:

```text
GET /ws/2/work/{workId}?inc=recording-rels&fmt=json
```

Normalize that response to a map keyed by Recording MBID with performance start/end, relationship attributes (live, instrumental, cover, partial, etc.), title, duration, and disambiguation. Join the map to the small text-search result set locally. This gives exact Work linkage and true performance dates in one additional request without browsing hundreds of Recordings page by page.

If the Work index call fails, return text-search candidates with a visibly weaker evidence state. If a text-search candidate is not linked to the Work, rank it down rather than hiding it because MusicBrainz relationship coverage is incomplete.

The ranking invariants that do not depend on fuller Release browsing are:

1. exact link to the Song's Work;
2. credited-artist and title agreement;
3. closeness to known duration, retaining the existing three-second tolerance;
4. presence of a performance date;
5. a trusted album hint (soft boost only; users can continue to ignore it);
6. MusicBrainz search score.

If a text-search candidate is linked to the Work, it ranks above otherwise-similar unlinked candidates, but multiple candidates can satisfy every invariant above. The API result should include human-readable evidence such as "linked to this Song's Work", "duration differs by 1s", and "recorded 1958-05". These explanations are transient UI data, not database columns.

**Decided — resolve ambiguous Work-linked candidates on demand.** Do not use incomplete search Release summaries to manufacture a confident winner when multiple candidates remain equivalent on the strong evidence. Treat the leading set as ambiguous when two or more candidates:

- link to the Song's exact Work;
- agree on title and credited artist;
- are within the existing duration tolerance; and
- have no decisive difference in performance date or relationship attributes.

Show an explicit "multiple plausible matches" state with the available evidence rather than the current single confident suggestion. A user-triggered **Compare release history** action then browses complete Releases for the bounded tied set (initially at most three candidates), reranks them using full Release Group/edition evidence, and explains the result. The comparison is never fetched speculatively. The user still confirms the Recording; if complete Release evidence remains inconclusive or unavailable, preserve the ambiguity instead of forcing a winner.

Full Release evidence has two distinct uses after that on-demand browse: the earliest credible official path informs Original Release, even when it is a Compilation, while eligible non-compilation/non-remix Album or EP evidence informs Primary Release. Compact search-summary evidence can be displayed as provisional context, but must not resolve the tie.

### 3. Resolve an inspected or confirmed Recording

When the user requests Release comparison, or when a clear candidate is confirmed, resolve the Recording itself:

```text
GET /ws/2/recording/{recordingId}?inc=artist-credits+work-rels&fmt=json
```

Use the performance relationship that targets the Song's exact Work MBID. Do not borrow a date from a different Work on medleys, and never substitute `first-release-date` for a performance date.

Then browse all Releases containing the Recording. An on-demand comparison performs this sequence for each candidate in the bounded tied set; a clear match performs it only for the confirmed candidate:

```text
GET /ws/2/release?recording={recordingId}&inc=release-groups+artist-credits&fmt=json&limit=100
```

Use paging when MusicBrainz reports more results. A Recording lookup with `inc=releases` is not sufficient for this job because linked-entity lookups are capped and ordered by MBID, not by date.

Resolve two Release Group roles and representative edition detail separately:

- **Original Release:** choose the Release Group containing the earliest credible official Release of this exact Recording, regardless of whether its type is Single, EP, Album, Compilation, or Other. A previously unreleased performance first issued on a compilation legitimately has that compilation as its Original Release. If dates are missing or tied across equally plausible groups, preserve ambiguity/null rather than manufacturing chronology.
- **Primary Release:** consider only Release Groups that actually contain the Recording. Exclude Compilation and Remix candidates by default; Live or Soundtrack remains eligible when it describes the actual source. Prefer Album, then EP. A trusted YouTube Music album hint may choose among those eligible groups only when its identity or normalized metadata can be reconciled to a candidate; title resemblance alone cannot make a group eligible. If equally useful candidates remain, preserve null/ambiguity. If no better album context exists, use Original Release, which may be a Single, Compilation, or another type.
- Original and Primary can point to the same Release Group; compute them independently rather than assuming they differ.
- For edition-level source inspection, choose the earliest official Release within Primary Release as `musicbrainz_release_id`; if Primary is null, use Original Release, and fall back to the best available edition only if no official one exists. Original Release chronology remains derived from the full browse evidence and does not require a second edition pointer until a concrete UI needs it.

### Original Release and Primary Release

Persist both relationships when the evidence supports them:

- `original_release_group_id` answers “where was this exact Recording first credibly published?”
- `primary_release_group_id` answers “which album context is most useful for presenting and browsing this Recording?”

If a single predates an album, Original points to the single and Primary points to the album. For an ordinary album track, both normally point to the album. Default release title and art use Primary, then fall back to Original. Most UI displays only that title; provenance/detail UI can expose both relationships when they differ.

The normalized result supplies editable snapshots (credited artist, current release-title hint, duration, performance date) plus durable identities for Recording, Original Release Group, Primary Release Group, and representative Release. On-demand comparison returns those normalized results as transient evidence without changing the form. Confirming a candidate, or explicitly updating an already-linked Recording from MusicBrainz, loads settled values into the form; the existing Save action remains the point that persists them.

### 4. Cover art

Use Primary Release Group art, falling back to Original Release Group art. Call the Release Group endpoint directly; no MusicBrainz lookup or stored image URL is needed:

```text
https://coverartarchive.org/release-group/{releaseGroupId}/front-250
```

A 404 is an ordinary no-art state. Edition-specific art can be added later inside the planned release-detail view.

## Normalized app contract

The provider adapter should return app terms and scalar units suitable for comparison, for example:

```ts
interface RecordingCandidateSet {
  state: "clear" | "ambiguous" | "degraded";
  candidates: RecordingCandidate[];
}

interface RecordingCandidate {
  recordingId: string;
  title: string;
  artistCredit: string;
  durationMs: number | null;
  workMatch: boolean | null; // null means the Work index was unavailable
  performanceDateStart: string | null;
  performanceDateEnd: string | null;
  relationshipAttributes: string[];
  releaseEvidenceState: "search-summary" | "full-browse" | "unavailable";
  // Search-derived Release evidence is provisional until a full browse and
  // cannot resolve an otherwise ambiguous candidate set.
  releaseGroups: Array<{
    id: string;
    title: string;
    primaryType: string | null;
    secondaryTypes: string[];
    earliestCandidateReleaseDate: string | null;
    representativeReleaseId: string | null;
  }>;
  originalReleaseGroupId: string | null;
  primaryReleaseGroupId: string | null;
  evidence: string[];
}
```

`originalReleaseGroupId` and `primaryReleaseGroupId` remain null while `releaseEvidenceState` is only `search-summary`; they become settled values only after the full browse supports them. A provisional title/album hint belongs in evidence or an explicitly named hint field, not in either durable relationship field.

Keep milliseconds inside the metadata adapter/ranker and format for display at the UI edge. The existing `recordings.duration` text field can remain for this milestone; changing duration storage is a separate migration, not required to fix MusicBrainz matching.

## Database boundary

Persist normalized app facts and durable source identities only:

- keep `songs.musicbrainz_work_id`;
- keep `recordings.musicbrainz_recording_id`;
- add a shared Release Group identity with provider mappings (initially MusicBrainz Release Group; a future Discogs Master can identify the same Standards entity);
- add nullable `recordings.original_release_group_id` and `recordings.primary_release_group_id` relationships to shared Release Groups; permit both to reference the same row and leave either null when evidence is ambiguous;
- retain nullable `recordings.musicbrainz_release_id uuid` only as the representative edition pointer;
- replace the planned single date with nullable `recordings.recording_date_start text` and `recording_date_end text`. MusicBrainz dates can be `YYYY`, `YYYY-MM`, or `YYYY-MM-DD`; text preserves partial precision, and two fields preserve actual ranges. Add shape checks and require end to be null or not earlier than start where comparable;
- keep `recordings.year` during migration for unmatched/manual rows, backfill valid years into `recording_date_start`, then have matched rows display the year prefix of `recording_date_start`. Removal of `year` can wait until every edit path uses the new fields;
- add the already-planned editable Song "Part of" text field only when that UI work is taken up. Return all suitable parent Work titles as choices, but store the confirmed display text as a shared Song fact rather than persisting a provider relationship graph. It is not a private `song_user_data` preference; editing it is therefore subject to the shared canonical-write policy.

Do **not** persist raw MusicBrainz JSON, search scores, evidence strings, Release status/type/date copies, the Work's Recording index, Cover Art Archive URLs, or every Release containing a Recording. Those are request/cache or ranking inputs. ISRCs likewise stay out until a concrete Platform Link matching use requires them.

### Artist identity

The former non-Person identity blocker is settled by [ADR-0008](../adr/0008-provider-neutral-music-entities-and-user-data.md): local Artist is broad enough for MusicBrainz Person, Group, Orchestra, Choir, Character, and Other identities. Song writing roles belong on Song-to-Artist credits, and structured Recording performer credits target the same Artist identity. Preserve credited-as text and never infer a group's members. Shared `artists`, private `artist_user_data`, and the target credit relationships are the implemented storage boundary.

## Transport boundary

[MusicBrainz requires](https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting) a meaningful, contactable User-Agent and currently limits a source IP to an average of one request per second. Every MusicBrainz request uses the shared server-only transport in `src/lib/musicbrainzTransport.ts`, which:

- spaces upstream request starts by at least one second through one per-process queue;
- identifies Standards with the repository URL and requests JSON centrally;
- starts a 20-second abort timeout only after queue waiting is complete; and
- normalizes cancellation, timeout, rate-limit, upstream-status, malformed-response, and network failures.

The transport does not retry or cache. Calls remain user-triggered by search, confirmation, or explicit Update; do not poll MusicBrainz for changes. A per-process limiter is sufficient for the current solo deployment. Reconsider bounded retries, caching, or distributed rate limiting only if observed usage or the deployment model warrants them.

## Code placement

Extract pure normalization, date/release selection, and candidate ranking under `src/utils/` as those seams are implemented and tested. Keep effectful fetching and provider parsing in `src/lib/`, including the shared `musicbrainzTransport.ts` boundary; keep route handlers returning normalized app contracts and components concerned with search state, evidence display, confirmation, and save state.

A big-bang split of the current `src/lib/musicbrainz.ts` into a new directory is not part of the matching milestone. Further module reorganization can follow the existing lib/effectful and utils/pure rule when concrete file boundaries emerge.

## Work items and status

1. **Work-aware candidate join and true dates.** Implement the text-search/Work-index join, exact-Work start/end parsing, evidence, and the `recording_date_start` / `recording_date_end` migration. Keep unlinked candidates visible.
2. **On-demand ambiguous candidate resolution.** Return an explicit ambiguous state, add the user-triggered comparison of at most three tied candidates, explain the fuller Release evidence, and preserve unresolved ties. Do not browse candidate Releases automatically.
3. **Release Group resolution.** Browse complete release history, resolve Original and Primary Release Groups independently, add shared Release Group storage and both Recording relationships, switch art to Primary with Original fallback, and retain Release ID only as a representative-edition pointer.
4. **Work provenance.** Add the editable "Part of" field and normalized parent Work choices when that UI work is selected.
5. **Structured selected performers.** Store selected performer relationships against the shared Artist identity per [artist-browsing.md](artist-browsing.md). Producer, engineer, publisher, arranger, and inferred group membership remain out of scope until explicitly wanted.
6. **Release-level amortization — Blocked on items 1–3.** Use a sibling Recording's confirmed Release/Release Group as a strong suggestion when adding another track from the same Release Group.

**Future:** a broader MusicBrainz module reorganization, distributed rate limiting, sideways browsing through alternatives beyond the comparison required by item 3, a release-detail view for edition/media/remaster data, and user-triggered fallback artwork.
