// The song list is rendered directly in (browse)/layout.tsx, not through
// this slot — see the comment there. This fallback only exists so the
// unnamed slot resolves for nested URLs like /tune/[id] instead of 404ing.
export default function BrowseDefault() {
  return null;
}
