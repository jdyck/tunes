"use client";

import { usePathname } from "next/navigation";

// The @recording slot always resolves to *something* (its own page or
// default.tsx), but we only want to reserve pane width for it when the
// current URL is actually pointing at a recording — otherwise it collapses
// so the song pane gets the full remaining width.
export default function RecordingPaneWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isRecordingOpen = /\/recording\//.test(pathname);

  if (!isRecordingOpen) return null;

  return (
    <div className="fixed inset-x-0 top-0 bottom-0 z-30 overflow-y-auto bg-merino-100 pb-16 lg:absolute lg:left-auto lg:right-0 lg:top-0 lg:bottom-0 lg:block lg:w-96 lg:h-full lg:overflow-y-auto lg:pb-0 lg:border-l lg:border-line-100 lg:shadow-[-12px_0_24px_rgba(32,29,27,0.12)] min-[95.25rem]:static min-[95.25rem]:inset-auto min-[95.25rem]:z-auto min-[95.25rem]:shrink-0 min-[95.25rem]:shadow-none">
      {children}
    </div>
  );
}
