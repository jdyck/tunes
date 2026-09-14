# Domain Docs

How the engineering skills should consume this repository’s domain documentation.

## Before exploring, read these

- `docs/domain-model.md` for terminology and private/canonical boundaries.
- Relevant ADRs under `docs/adr/` for settled architectural trade-offs.

## Layout

This is a single-context repository:

```text
/
├── docs/domain-model.md
├── docs/adr/
└── src/
```

## Use the glossary’s vocabulary

Use domain terms as defined in `docs/domain-model.md`. Do not drift to synonyms
it explicitly avoids. If a needed concept is absent, reconsider the terminology
or note the gap for domain modeling.

## Flag ADR conflicts

If proposed work contradicts an ADR, surface the conflict explicitly instead of silently overriding it.
