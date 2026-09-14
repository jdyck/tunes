# Docs index

Start here after time away from the project, before opening an editor.

## Naming in documentation

Use capitalized domain names—**User**, **Song**, **Artist**, **Recording**, and **Release Group**—when discussing concepts. Use backticked, exact project identifiers for concrete database tables, fields, indexes, constraints, or code/API identifiers. Convex schema names use camelCase (for example, `songUserData`, `userRecordingData`, and `userId`); do not invent SQL-style snake_case names for them. Some normalized API payloads intentionally use snake_case, so preserve those names when the contract defines them. Describe the conceptual private layer as a User's private data, rather than using a table name as its general-purpose name.

- [project-stage.md](project-stage.md) — the mutable, authoritative statement of who is using the app now and what privacy/migration assumptions are currently allowed. Check it before schema, authorization, auth, or data-migration work, and update it immediately when its transition trigger is reached.
- [domain-model.md](domain-model.md) — ubiquitous language (Song, Artist, Recording, Release Group, and their user-data/provider layers) and *why* the model is shaped this way. Read this before touching naming or data model in code.
- [adr/](adr/) — architecture decision records. Point-in-time decisions and the reasoning/rejected alternatives behind them.
- [verifying-changes.md](verifying-changes.md) — reusable checks for code, UI, route, backend, and migration changes.
- [working-with-agents.md](working-with-agents.md) — collaboration, worktree safety, and best-practice pushback norms.
- [agents/local-dev-access.md](agents/local-dev-access.md) — dedicated Clerk development accounts, local agent login, and fixture setup.

Unfinished approved work belongs in GitHub Issues. Provisional investigations,
plans, and evidence-backed gaps belong in the ignored `local/wip/` workspace;
they are not committed project direction.

See also, at repo root:

- `../README.md` — human-facing pitch + setup instructions.
- `../AGENTS.md` — instructions for AI coding agents (stack, commands, guardrails). Links back into this folder for domain language and architecture.
