# Tunes

A personal tool for consolidating scattered musical repertoire — song lists and lead sheets currently kept on paper and scattered across digital tools, plus liked recordings currently tracked as one YouTube Music playlist per song. Those playlists work for focused/analytical listening (transcription, comparison) but get in the way of casual listening, so this app exists to hold that analytical, per-song recording list on its own, separate from casual playlists. Built for personal use first, with multi-user use as a goal.

## Language

**Song**:
A canonical, shared piece of music — title, composer, year, lyricist, etc. — genre-neutral (not jazz-specific "tune" or lyrics-specific "song" in the strict sense; covers instrumental pieces too). Shared across all users: any user can create a new Song when search/autocomplete finds no match, so occasional duplicates are expected and get merged by a Site Admin later rather than gated upfront. This reverses an earlier assumption that song data would stay fully siloed per user — see [ADR-0003](adr/0003-song-canonical-user-song-personal.md).
_Avoid_: Tune (legacy/jazz-specific term being phased out)

**User Song**:
A User's personal copy of a Song: their own notes, their own display title (can diverge from the Song's canonical title — e.g. "I Found a New Baby" instead of the canonical "I've Found a New Baby"), and their Recordings. One undifferentiated list regardless of mastery — gig-ready repertoire, songs being studied/transcribed, and someday-songs all live together; no mastery-level silos. In the UI this is simply presented as "Songs" (the user's list) — "User Song" is glossary/backend vocabulary, not a UI label.
_Avoid_: My Tune, Listed Song, Repertoire Entry (earlier names considered and rejected)

**Recording**:
A specific recorded version of a Song that a user has added to their User Song, with a personal rating and preferred sort order. Its `name` is currently free text (not a structured artist field) because attribution is genuinely ambiguous: the credited artist a recording is published under can differ from notable performers on it (e.g. Barney Kessel playing guitar on a Billie Holiday recording), and some recordings (concert footage, indie YouTube uploads) have no canonical published attribution at all. Structured metadata here is deferred, unlike canonical Song data.
_Avoid_: Artist, performer (as a stand-in for `name` — these are distinct future concepts, not yet modeled)

**User**:
A person using the app to track their own Songs (via User Song) and Recordings. Multi-user support is a design goal; canonical Song metadata is shared across users, but User Song and Recording data stays private to each user.

**Lead Sheet / Score**:
An image or PDF of sheet music a user attaches to a Song. Private by default, even if the underlying work is public domain. Can only become visible to other users if a Site Admin personally vets it and marks it public — never automatic, never self-service by the uploading user.
_Avoid_: Chart (unless quoting a genre convention)

**Site Admin**:
A trusted role (the app owner, or someone they explicitly trust), distinct from an ordinary User, who can vet and approve content — e.g. marking a Lead Sheet as verified public domain, or merging duplicate Songs — for visibility across users.
_Avoid_: Moderator, curator
