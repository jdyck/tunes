"use client";

import Link from "next/link";
import { XMarkIcon } from "@heroicons/react/20/solid";
import { usePathname } from "next/navigation";

// The @recording slot always resolves to *something* (its own page or
// default.tsx), but we only want to reserve pane width for it when the
// current URL is actually pointing at a recording — otherwise it collapses
// so the song pane gets the full remaining width.
export default function RecordingPaneGate({
  children,
  backHref,
}: {
  children: React.ReactNode;
  backHref: string;
}) {
  const pathname = usePathname();
  const isRecordingOpen = /\/recording\//.test(pathname);

  if (!isRecordingOpen) return null;

  return (
    <>
      <Link
        href={backHref}
        aria-hidden="true"
        tabIndex={-1}
        className="fixed inset-0 z-[var(--layer-recording-detail)] hidden cursor-default lg:block xl:hidden"
      />
      <div className="fixed inset-x-0 top-0 bottom-0 z-[var(--layer-recording-detail)] overscroll-none bg-surface-app lg:absolute lg:left-auto lg:right-0 lg:top-0 lg:bottom-0 lg:block lg:h-full lg:w-sm lg:border-l lg:border-line-100 lg:shadow-[-12px_0_24px_rgba(32,29,27,0.12)] xl:w-md 2xl:static 2xl:inset-auto 2xl:z-auto 2xl:shadow-none">
        <Link
          href={backHref}
          aria-label="Close recording details pane"
          className="absolute left-4 top-4 z-10 hidden rounded-md p-1 text-ink-600 hover:bg-old-lace-100 hover:text-ink-900 lg:block 2xl:hidden"
        >
          <XMarkIcon className="h-6 w-6" />
        </Link>
        {children}
      </div>
    </>
  );
}
