# Current project stage

- **Current stage:** trusted development and testing
- **Last reviewed:** 2026-07-21

This is the repository's mutable operational-status document, not an ADR. It answers what privacy and migration assumptions are valid **right now**. Update it immediately when the project crosses one of the transition triggers below; do not preserve old stage text here for history.

## What the current stage means

- The only Users are the owner and a small number of personally known, explicitly invited testers.
- Current database content is development/test content. It is not being treated as sensitive personal data or as content whose authors expect confidentiality from the other trusted testers.
- Data migrations do not need zero-exposure choreography merely to prevent temporary visibility of current User-scoped test data among authenticated trusted testers. A migration plan may accept a short, explicit transition window while tables, queries, and RLS policies move to their target shape.
- Existing Song and Recording data is useful and should be preserved by default, but it is still replaceable development data: the owner has not stored personal notes of consequence and accepts a targeted reset or loss when it materially simplifies work that unlocks the next model. Never discard, corrupt, or merge rows silently; explain the concrete benefit and get explicit approval for the destructive step first.
- Authentication credentials, API keys, and other secrets are never covered by this relaxed test-data assumption.

The relaxed migration posture is temporary. It does **not** change the target domain model: `song_user_data`, `artist_user_data`, and `user_recording_data` remain private per User, and completed migrations must finish with the intended RLS policies and User-scoped application queries in place. It also does not relax the private-by-default and admin-gated publishing rule for future Lead Sheets.

## Transition to privacy-active use

Change this document to **privacy-active** before either of these happens:

- someone other than the owner or a personally known, explicitly invited tester receives access; or
- any User begins storing content they expect to remain private from another User, even if everyone is still a tester.

Whichever happens first is the transition point. Do not wait for a public launch or a large User count.

When transitioning:

1. Change the current-stage line and review date at the top of this file.
2. Remove the permission for temporary cross-User test-data visibility from the current-stage description.
3. Review unfinished schema/data-migration plans for transition windows that expose or mix User-scoped data; revise or finish them before admitting privacy-active data.
4. Verify RLS and application queries with at least two Users for every private user-data table then in use.
5. Update any plan or direction document that explicitly relied on the trusted-testing stage.

Once the stage is privacy-active, confidentiality becomes a migration requirement rather than only a target end state. Later changes may strengthen that posture further, but must not silently downgrade it.
