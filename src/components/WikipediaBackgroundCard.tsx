import { XMarkIcon } from "@heroicons/react/20/solid";

export default function WikipediaBackgroundCard({
  extract,
  url,
  onRemove,
  className = "p-3 rounded-md border border-line-200",
}: {
  extract: string;
  url: string | null;
  onRemove?: () => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className={onRemove ? "flex items-start justify-between gap-2" : undefined}>
        <p className="text-sm">{extract}</p>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove background"
            className="shrink-0"
          >
            <XMarkIcon className="h-5 w-5 text-ink-600" />
          </button>
        )}
      </div>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-teal-700 underline"
        >
          via Wikipedia, CC BY-SA
        </a>
      )}
    </div>
  );
}
