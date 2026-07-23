# Docs index

Start here after time away from the project, before opening an editor.

## Naming in documentation

Use capitalized domain names—**User**, **Song**, **Artist**, **Recording**, and **Release Group**—when discussing concepts. Use backticked snake_case only for a concrete database table, column, constraint, or code identifier (for example, `user_recording_data` or `user_id`). Describe the conceptual private layer as a User's private data, rather than using a table name as its general-purpose name.

- [project-stage.md](project-stage.md) — the mutable, authoritative statement of who is using the app now and what privacy/migration assumptions are currently allowed. Check it before schema, RLS, auth, or data-migration work, and update it immediately when its transition trigger is reached.
- [domain-model.md](domain-model.md) — ubiquitous language (Song, Artist, Recording, Release Group, and their user-data/provider layers) and *why* the model is shaped this way. Read this before touching naming or data model in code.
- [adr/](adr/) — architecture decision records. Point-in-time decisions and the reasoning/rejected alternatives behind them.
- [direction/](direction/) — one file per subject/issue (e.g. `music-player.md`, `artist-browsing.md`). Each file mixes whatever's true about that subject — known problems, things to add, patterns to avoid — rather than being sorted into "bugs" vs "features" categories. Looser and more opinionated than an ADR; not all of it will happen.

See also, at repo root:

- `../README.md` — human-facing pitch + setup instructions.
- `../AGENTS.md` — instructions for AI coding agents (stack, commands, guardrails). Links back into this folder for domain language and direction.
