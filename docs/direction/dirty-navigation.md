# Protect unsaved detail edits during navigation

Song and Recording detail editors must warn before an application-controlled
navigation or overwriting action discards dirty fields. Reload, tab close, and
full-document navigation use the browser's standard unsaved-changes prompt.
Playback, search-state changes, and other actions that retain the draft do not
prompt.

The provider belongs at the browse-layout boundary defined by
[ADR-0010](../adr/0010-responsive-browse-layout-hybrid-parallel-routes.md).
Song and Recording panes can be mounted simultaneously, so editors register by
stable route identity. A target-aware guard determines which registrations a
navigation would discard; it must not assume that the last-mounted editor is
the only active one.

Same-origin client links should share one guarded-link seam, and programmatic
`push`, `replace`, or `back` calls that discard an editor must use the same
decision. Browser Back/Forward behavior must be proven against the parallel
route tree before adding history manipulation; do not ship a sentinel loop
that can prompt repeatedly or corrupt the expected one-step history behavior.

Provider metadata updates that replace draft fields should use concise,
action-specific confirmation. Permanent removal already has a destructive
confirmation, so its copy should include unsaved-edit loss rather than showing
two prompts.
