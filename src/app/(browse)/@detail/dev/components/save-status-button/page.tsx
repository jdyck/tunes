import SaveStatusButton from "@/components/ui/SaveStatusButton";

export default function SaveStatusButtonDemoPage() {
  return (
    <div className="flex items-center gap-8">
      <div className="flex items-center gap-2">
        <span className="text-sm text-ink-600">Saved</span>
        <SaveStatusButton isSaved className="block relative" />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-ink-600">Unsaved</span>
        <SaveStatusButton isSaved={false} className="block relative" />
      </div>
    </div>
  );
}
