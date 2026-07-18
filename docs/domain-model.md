# Standards

The app is named **Standards** (renamed from "Tunes", July 2026 — the repo folder and Supabase project id still say `tunes`). "Standards" as in the repertoire sense: the songs a musician keeps.

A personal tool for consolidating scattered musical repertoire — song lists and lead sheets currently kept on paper and scattered across digital tools, plus liked recordings currently tracked as one YouTube Music playlist per song. Those playlists work for focused/analytical listening (transcription, comparison) but get in the way of casual listening, so this app exists to hold that analytical, per-song recording list on its own, separate from casual playlists. Built for personal use first, with multi-user use as a goal.

## Language

**Song**:
A canonical, shared piece of music — title, composer, year, lyricist, etc. — genre-neutral (not jazz-specific "tune" or lyrics-specific "song" in the strict sense; covers instrumental pieces too). Shared across all users: any user can create a new Song when search/autocomplete finds no match, so occasional duplicates are expected and get merged by a Site Admin later rather than gated upfront. This reverses an earlier assumption that song data would stay fully siloed per user — see [ADR-0003](adr/0003-song-canonical-user-song-personal.md).
_Avoid_: Tune (legacy/jazz-specific term being phased out)

**User Song**:
A User's personal copy of a Song: their own notes, their own display title (can diverge from the Song's canonical title — e.g. "I Found a New Baby" instead of the canonical "I've Found a New Baby"), and their Recordings. One undifferentiated list regardless of mastery — gig-ready repertoire, songs being studied/transcribed, and someday-songs all live together; no mastery-level silos. In the UI this is simply presented as "Songs" (the user's list) — "User Song" is glossary/backend vocabulary, not a UI label.
_Avoid_: My Tune, Listed Song, Repertoire Entry (earlier names considered and rejected)

**Recording**:
A specific recorded version of a Song that a user has added to their User Song, with a personal rating and preferred sort order. Its `name` is free text — a recording's own title is often a live/session descriptor (e.g. "Live at Village Vanguard, 1961") rather than just the Song title. Recording also carries `artist` (the publication-credited artist), `album`, `year` (of that recording's release — distinct from the Song's own composition year), `duration`, `key`, `tempo`, and `tags` — plain fields, hand-entered or auto-filled from YouTube search metadata where available (see [direction/streaming-platform-links.md](direction/streaming-platform-links.md)), with no controlled vocabulary. `artist` is deliberately a single free-text value, not a structured performer list: the credited artist a recording is published under can differ from notable performers on it (e.g. Barney Kessel playing guitar on a Billie Holiday recording), and some recordings (concert footage, indie YouTube uploads) have no canonical published attribution at all. An `artists` table and `recording_artists` join table already exist in the database for that multi-performer case but are unused — reserved for a future feature, distinct from the single `artist` field. Every Recording has a `kind` — see below.
_Avoid_: performer (as a stand-in for `artist` — a distinct future concept, backed by the dormant `recording_artists` table, not yet built)

**Recording Kind**:
Whether a Recording is `released` (an officially released audio track or music video — eligible for cross-platform matching via Platform Links) or `video_capture` (performance footage, a broadcast rip, or another unofficial video — exists only as a YouTube video, no commercial release to match against). A future `user_upload` kind (self-hosted media a user uploads directly) is anticipated but not yet built. Deliberately not called "format": format would suggest the original release medium (vinyl, tape, CD, lacquer), which this project doesn't model at all — Kind is only about whether the recording is an official release or not, regardless of what medium it first appeared on.
_Avoid_: Format, type

**Platform Link**:
A link from a `released` Recording to where it can be played on one specific platform (Spotify, Apple Music, Amazon Music, or YouTube Music) — one Recording can have several, one per matched platform. Sourced automatically from the Odesli API rather than entered by hand, and only attempted for `released` Recordings; a `video_capture` Recording has no Platform Links, only its YouTube video. Absence of a Platform Link for some platform is expected and normal (most Recordings won't be matched everywhere), not a failure state.
_Avoid_: Streaming link, external link (too generic — Platform Link is specifically one of the matched streaming platforms, not any arbitrary URL)

**User**:
A person using the app to track their own Songs (via User Song) and Recordings. Multi-user support is a design goal; canonical Song metadata is shared across users, but User Song and Recording data stays private to each user. Each User has a Platform Preference.

**Platform Preference**:
A User's own ranked list of which platforms they care about (e.g. YouTube Music, YouTube, Amazon Music, Spotify, in that order for one User; Spotify, YouTube for another) — an order, not just a set. Controls which Platform Links are shown for a Recording (unranked platforms are hidden) and which is shown as the primary "Play on X" action (the highest-ranked platform that has a match). The YouTube video is always shown as a fallback when none of a User's ranked platforms have a match, since it's the guaranteed source rather than a subscription-gated platform.

**Lead Sheet / Score**:
An image or PDF of sheet music a user attaches to a Song. Private by default, even if the underlying work is public domain. Can only become visible to other users if a Site Admin personally vets it and marks it public — never automatic, never self-service by the uploading user.
_Avoid_: Chart (unless quoting a genre convention)

**Site Admin**:
A trusted role (the app owner, or someone they explicitly trust), distinct from an ordinary User, who can vet and approve content — e.g. marking a Lead Sheet as verified public domain, or merging duplicate Songs — for visibility across users.
_Avoid_: Moderator, curator
