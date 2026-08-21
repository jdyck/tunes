# Artist attributions are structured identity-bearing credits

Recording Attribution and Release Group Attribution are ordered, structured
credits rather than flattened display strings. Each part references one
canonical Standards Artist and retains that Artist's credited-as name, exact
following join phrase, and order. Recording and Release Group parts live in
separate explicit relationships with a shared shape and shared behavior;
Recording Attribution remains distinct from Recording Personnel.

This refines [ADR-0008](0008-provider-neutral-music-entities-and-user-data.md),
which allowed `Recording.artist` to remain the editable display snapshot. A
single string was initially simpler, but it discarded MusicBrainz join phrases,
could not link several credited Artists independently, and conflated a credited
name with its canonical Artist identity. Structured credits preserve cases such
as one Artist being credited under another name and collaborations joined by
“with,” “and,” “&,” “/,” or arbitrary published wording.

Legacy, manual, and provider-supplied Recording text remains temporarily as
Attribution Fallback. It is displayed only when structured Recording
Attribution is absent and never creates an Artist identity or browsing
relationship. Standards does not parse fallback strings automatically or turn
ordinary provider channels into Artists. Manual editing instead reuses an
existing Artist or explicitly creates a provider-unmatched Artist, while
MusicBrainz match/refresh resolves Artists by their stable MusicBrainz IDs.

Release Group Attribution belongs to the master-level Release Group rather
than a representative edition or any contained Recording. It can make an
Artist reachable through a User's saved Recordings without creating a Song
Credit, Recording Attribution, or Personnel relationship. Artist browsing
deduplicates each saved Recording while explaining every path by which it is
related to the Artist.
