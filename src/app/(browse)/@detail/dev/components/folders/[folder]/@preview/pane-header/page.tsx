import PaneHeader from "@/components/layout/PaneHeader";

export default function PaneHeaderDemoPage() {
  return (
    <div className="max-w-md border border-paper-600">
      <PaneHeader
        backHref="/dev/components/folders/layout"
        backLabel="Back"
      >
        <div className="pb-4">
          <h1 className="text-2xl font-bold">Pane title</h1>
        </div>
      </PaneHeader>
    </div>
  );
}
