# Domain Docs

How the engineering skills should consume this repository’s domain documentation.

## Before exploring, read these

- `CONTEXT.md` at the repository root, if present.
- Relevant ADRs under `docs/adr/`.

If a file does not exist, proceed silently. Domain-modeling skills create `CONTEXT.md` lazily when terms or decisions are resolved.

## Layout

This is a single-context repository:

```text
/
├── CONTEXT.md
├── docs/adr/
└── src/
```

## Use the glossary’s vocabulary

Use domain terms as defined in `CONTEXT.md`. Do not drift to synonyms it explicitly avoids. If a needed concept is absent, reconsider the terminology or note the gap for domain modeling.

## Flag ADR conflicts

If proposed work contradicts an ADR, surface the conflict explicitly instead of silently overriding it.
