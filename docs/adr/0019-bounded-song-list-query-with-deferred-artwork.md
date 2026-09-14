# Bounded Song-list query with deferred artwork

The Songs list reads up to 2,000 of one User's memberships, then performs
search, sorting, tag facets, favorite and Holiday filtering, counts, and row
windowing on that client result. Fetch pagination would make those global
interactions silently partial. Song artwork is fetched separately from
representative saved-Recording context so rows can render immediately and use a
placeholder when imagery is absent.

Keep row windowing, lazy image loading, and the `RecordingThumbnail` fallback
chain together; loosening one without the others can fan a large library into a
burst of third-party artwork requests.

Revisit this only when the up-to-2,000-row fetch itself is slow or the bound is
no longer appropriate; a server-paged replacement must move search, sort keys,
facet aggregates, and counts together instead of paging rows alone.
