# Docs index

Start here after time away from the project, before opening an editor.

- [domain-model.md](domain-model.md) — ubiquitous language (Song, Artist, Recording, Release Group, and their user-data/provider layers) and *why* the model is shaped this way. Read this before touching naming or data model in code.
- [adr/](adr/) — architecture decision records. Point-in-time decisions and the reasoning/rejected alternatives behind them.
- [direction/](direction/) — one file per subject/issue (e.g. `song-user-song-split.md`, `music-player.md`). Each file mixes whatever's true about that subject — known problems, things to add, patterns to avoid — rather than being sorted into "bugs" vs "features" categories. Looser and more opinionated than an ADR; not all of it will happen.

See also, at repo root:

- `../README.md` — human-facing pitch + setup instructions.
- `../AGENTS.md` — instructions for AI coding agents (stack, commands, guardrails). Links back into this folder for domain language and direction.
