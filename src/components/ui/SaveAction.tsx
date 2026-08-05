import PrimaryButton from "@/components/ui/PrimaryButton";
import type { SaveLifecycleStatus } from "@/utils/saveLifecycle";

export default function SaveAction({
  status,
  error,
  onSave,
  className = "",
}: {
  status: SaveLifecycleStatus;
  error?: string | null;
  onSave?: () => void;
  className?: string;
}) {
  if (status === "clean") return null;

  if (status === "recently-saved") {
    return (
      <p
        role="status"
        className={`text-sm font-semibold text-azure-600 ${className}`.trim()}
      >
        Saved
      </p>
    );
  }

  const saving = status === "saving";
  const failed = status === "error";

  return (
    <div className={className} aria-live="polite">
      <PrimaryButton
        type={onSave ? "button" : "submit"}
        onClick={onSave}
        disabled={saving}
        className="px-3 py-2 font-semibold disabled:opacity-70"
      >
        {saving ? "Saving..." : failed ? "Try saving again" : "Save"}
      </PrimaryButton>
      {failed && (
        <p className="mt-1 text-sm text-vermillion-600">
          {error || "Changes weren't saved. Try again."}
        </p>
      )}
    </div>
  );
}
