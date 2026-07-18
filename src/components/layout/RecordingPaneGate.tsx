"use client";

import { usePathname } from "next/navigation";

// The @recording slot always resolves to *something* (its own page or
// default.tsx), but we only want to reserve pane width for it when the
// current URL is actually pointing at a recording — otherwise it collapses
// so the song pane gets the full remaining width.
export default function RecordingPaneGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isRecordingOpen = /\/recording\//.test(pathname);

  if (!isRecordingOpen) return null;

  return (
    <div className="fixed inset-x-0 top-0 bottom-0 z-30 overscroll-none bg-surface-app lg:absolute lg:left-auto lg:right-0 lg:top-0 lg:bottom-0 lg:block lg:w-sm xl:w-md lg:h-full lg:border-l lg:border-line-100 lg:shadow-[-12px_0_24px_rgba(32,29,27,0.12)] 2xl:static 2xl:inset-auto 2xl:z-auto  2xl:shadow-none">
      {children}
    </div>
  );
}
