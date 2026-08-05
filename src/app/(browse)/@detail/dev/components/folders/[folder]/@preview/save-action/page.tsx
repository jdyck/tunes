import SaveAction from "@/components/ui/SaveAction";

export default function SaveActionDemoPage() {
  return (
    <div className="grid grid-cols-[auto_1fr] items-start gap-x-4 gap-y-5">
      <span className="text-sm text-ink-600">Clean</span>
      <span className="text-sm text-ink-500">No persistent control</span>
      <span className="text-sm text-ink-600">Dirty</span>
      <SaveAction status="dirty" />
      <span className="text-sm text-ink-600">Saving</span>
      <SaveAction status="saving" />
      <span className="text-sm text-ink-600">Success</span>
      <SaveAction status="recently-saved" />
      <span className="text-sm text-ink-600">Error</span>
      <SaveAction status="error" error="Changes weren't saved. Try again." />
    </div>
  );
}
