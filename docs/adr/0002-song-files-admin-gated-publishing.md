# Song Files are private by default; publishing is admin-gated, not self-service

Song Files can include lead sheets, scores, and eventually material such as
backing tracks. They may be copyrighted or otherwise not appropriate to share,
so they stay private to the uploading User by default regardless of a claimed
rights status. A Site Admin (the app owner or someone they explicitly trust)
may make a Song File visible to others only after personally vetting its
permission or public-domain status. There is no automatic or user-driven
publishing based on a checkbox or self-declaration.

The UI calls the collection **Files** because it appears in a Song's context;
**Song File** is the domain and code term. The private upload and delivery
mechanism is defined in
[ADR-0014](0014-private-song-file-delivery.md). It enforces owner access but
does not implement publishing.
