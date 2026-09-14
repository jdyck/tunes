# MusicBrainz metadata is advisory until explicit Save

MusicBrainz access stays server-side behind normalized application contracts;
the provider's Work, Recording, Release Group, Release, and Artist entities
are evidence for Standards entities, not replacements for them. Matching
returns clear, ambiguous, or degraded candidates, proposes only a clear winner,
and requires User confirmation before a selected result populates an editable
draft; only the existing explicit Save persists it. A provider failure preserves
stored metadata and never hides text-search candidates solely because a
Work-based lookup failed. The app enriches an existing Recording only after an
explicit refresh and does not bulk-fetch provider metadata as a migration.

Recording matching stays cheap and bounded. It ranks duration proximity first
because duration is the strongest practical take/version discriminator, then
uses lenient credited-artist and normalized-title agreement, an optional
album/year corroborator, exact Work linkage, and the provider score. Title
normalization may remove reissue noise such as remaster, mono/stereo, version,
or featuring labels, but it must preserve meaningful take, live, and alternate
markers. Album/year evidence is a soft discovery boost, never a filter or a
stored album decision. A failed Work lookup degrades the evidence without
removing text-search candidates; tied credible candidates remain ambiguous.

Search-summary Releases are provisional recognition hints only. They must not
supply a performance date or a durable Release Group relationship. After the
User selects a candidate, one exact Recording lookup may populate the draft
with detailed Work relationship, performance, Personnel, Release Group, and
representative-edition evidence. Provider milliseconds remain an internal
matching detail and are formatted only at the UI or save boundary.

This preserves data quality and private edit intent while keeping the provider
integration bounded. Date semantics, canonical boundaries, and structured
credit rules remain governed by ADRs 0007, 0008, and 0012 respectively.
