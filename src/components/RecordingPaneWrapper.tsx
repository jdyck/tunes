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
    <div className="fixed inset-x-0 top-16 bottom-0 z-30 overflow-y-auto pb-16 bg-slate-100 lg:static lg:inset-auto lg:z-auto lg:block lg:w-96 lg:shrink-0 lg:h-full lg:overflow-y-auto lg:pb-0 lg:border-l lg:border-slate-200">
      {children}
    </div>
  );
}
