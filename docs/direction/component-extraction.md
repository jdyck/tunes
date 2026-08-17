# Component extraction

Candidates for new shared components. Ground rules:

- Reuse the existing Tailwind classes verbatim when extracting — do not redesign, recolor, or "improve" styling in the same change (see [styling-cleanup.md](styling-cleanup.md)).
- Every new shared component gets a `componentRegistry.ts` entry (slug, name, path) plus a demo page under `src/app/(browse)/@detail/dev/components/folders/[folder]/@preview/<slug>/` (copy an existing demo page as the template). The dev gallery derives its folder navigation and URL from the registered source path, so place the demo under the matching folder route and keep the registry path accurate rather than maintaining a separate gallery category.
- One component per PR/commit-series; touch call sites in the same change so the old markup is actually deleted.
- Treat empty states as part of a component's design, not a separate afterthought. When a component's filled-state layout or visual language changes, update its empty state (and loading state where relevant) in the same work so they stay coherent.

## InlineSearchForm — deliberately deferred

The label + input + checkbox + search/cancel button cluster in `RecordingDetailContent.tsx` (MusicBrainz search) resembles search UI in `AddSongModal`/`AddRecordingModal`, but the modals differ enough that a shared abstraction now would be speculative. Wait for a third use. Don't build this without being asked.
