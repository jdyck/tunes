import { BoltIcon, BoltSlashIcon } from "@heroicons/react/20/solid";

export default function SaveStatusButton({
  isSaved,
  className = "block relative shrink-0",
}: {
  isSaved: boolean;
  className?: string;
}) {
  return (
    <button type="submit" title={isSaved ? "Saved" : "Unsaved changes"} className={className}>
      {isSaved ? (
        <BoltIcon className="h-5 w-5 text-green-600" />
      ) : (
        <BoltSlashIcon className="h-5 w-5 text-mojo-600" />
      )}
    </button>
  );
}
