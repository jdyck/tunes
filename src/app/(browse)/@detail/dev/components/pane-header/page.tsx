import PaneHeader from "@/components/layout/PaneHeader";

export default function PaneHeaderDemoPage() {
  return (
    <div className="max-w-md border border-line-200">
      <PaneHeader backHref="/dev/components/pane-header" backLabel="Back">
        <div className="pb-4">
          <h1 className="text-2xl font-bold">Pane title</h1>
        </div>
      </PaneHeader>
    </div>
  );
}
