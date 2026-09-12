import PaneHeader from "@/components/layout/PaneHeader";

export default function SongDetailSkeleton({
  backHref,
  backLabel,
}: {
  backHref: string;
  backLabel: string;
}) {
  return (
    <div
      className="flex h-full w-full flex-col bg-surface-app"
      role="status"
      aria-label="Loading song"
    >
      <span className="sr-only">Loading song...</span>
      <div aria-hidden="true" className="contents">
        <PaneHeader backHref={backHref} backLabel={backLabel} safeAreaTop>
          <div className="flex w-xl max-w-full items-center gap-4 pb-8 lg:max-w-md">
            <div className="w-full animate-pulse">
              <div className="h-14 w-4/5 rounded-sm bg-surface-sunken" />
              <div className="mt-3 h-5 w-1/2 rounded-sm bg-surface-sunken" />
            </div>
            <div className="w-40 grow-0">
              <div className="aspect-square w-36 animate-pulse bg-surface-sunken" />
            </div>
          </div>
        </PaneHeader>

        <div className="flex-1 overflow-hidden p-4 pb-[calc(4rem+env(safe-area-inset-bottom))]">
          <div className="animate-pulse">
            <div className="mb-2 flex max-w-xl items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-28 rounded-sm bg-surface-sunken" />
                <div className="h-5 w-5 rounded-full bg-surface-sunken" />
              </div>
              <div className="h-6 w-6 rounded-full bg-surface-sunken" />
            </div>

            <div className="mb-5 border-b border-border-default py-4">
              <div className="h-5 w-2/3 rounded-sm bg-surface-sunken" />
              <div className="mt-2 h-3.5 w-1/2 rounded-sm bg-surface-sunken" />
            </div>
            <div className="mb-5 border-b border-border-default py-4">
              <div className="h-5 w-1/2 rounded-sm bg-surface-sunken" />
              <div className="mt-2 h-3.5 w-1/3 rounded-sm bg-surface-sunken" />
            </div>

            <div className="mb-4 h-8 w-24 rounded-md bg-surface-sunken" />
            <div className="mb-1 h-3 w-10 rounded-sm bg-surface-sunken" />
            <div className="mb-5 h-7 w-20 rounded-sm bg-surface-sunken" />
            <div className="h-36 w-full max-w-xl rounded-md bg-surface-sunken" />
          </div>
        </div>
      </div>
    </div>
  );
}
