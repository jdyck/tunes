export default function BackLinkDemoPage() {
  return (
    <p className="text-sm text-ink-600 max-w-md">
      The arrow above &quot;Components&quot; in the sidebar nav <em>is</em>{" "}
      BackLink, pointed at <code>/</code> to leave the dev viewer. It's also
      used at the top of the Song panel (back to the songs list) and the
      Recording panel (back to the song) in the real app.
    </p>
  );
}
