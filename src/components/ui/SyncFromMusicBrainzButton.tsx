export default function SyncFromMusicBrainzButton({
  syncing,
  onClick,
  className = "text-xs text-teal-700 underline disabled:opacity-70",
}: {
  syncing: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button type="button" onClick={onClick} disabled={syncing} className={className}>
      {syncing ? "Updating..." : "Update from MusicBrainz"}
    </button>
  );
}
