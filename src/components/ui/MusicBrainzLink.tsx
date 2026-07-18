export default function MusicBrainzLink({
  type,
  id,
  className = "block text-xs text-teal-700 underline mb-1",
}: {
  type: "recording" | "work";
  id: string;
  className?: string;
}) {
  return (
    <a
      href={`https://musicbrainz.org/${type}/${id}`}
      target="_blank"
      rel="noreferrer"
      className={className}
    >
      View on MusicBrainz
    </a>
  );
}
