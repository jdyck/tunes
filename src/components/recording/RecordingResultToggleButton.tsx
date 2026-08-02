import {
  CheckCircleIcon,
  PlusCircleIcon,
} from "@heroicons/react/20/solid";
import Spinner from "@/components/ui/Spinner";

export type RecordingResultPendingState = "saving" | "removing" | null;

export default function RecordingResultToggleButton({
  saved,
  pending,
  onToggle,
}: {
  saved: boolean;
  pending: RecordingResultPendingState;
  onToggle: () => void;
}) {
  const label =
    pending === "saving"
      ? "Adding recording"
      : pending === "removing"
        ? "Removing recording"
        : saved
          ? "Remove saved recording"
          : "Add recording";

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={pending !== null}
      aria-label={label}
      title={label}
      className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full disabled:cursor-wait"
    >
      {pending ? (
        <Spinner className="h-7 w-7 text-azure-700" />
      ) : saved ? (
        <CheckCircleIcon className="h-8 w-8 text-azure-700" />
      ) : (
        <PlusCircleIcon className="h-8 w-8 text-ink-700 hover:text-action" />
      )}
    </button>
  );
}
