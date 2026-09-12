import Link from "next/link";
import { XMarkIcon } from "@heroicons/react/20/solid";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-full w-full items-center justify-center overflow-y-auto bg-azure-600 px-4 py-20 sm:px-6 sm:py-24">
      <Link
        href="/"
        aria-label="Close account settings"
        className="absolute right-4 top-4 z-10 inline-flex min-h-11 items-center gap-2 rounded-full bg-paper-100/95 px-4 text-sm font-semibold uppercase tracking-label text-ink-800 shadow-md transition-colors hover:bg-paper-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper-100 sm:right-6 sm:top-6"
      >
        <span>Close</span>
        <XMarkIcon aria-hidden="true" className="h-5 w-5" />
      </Link>

      <div className="w-full max-w-5xl justify-center grid">{children}</div>
    </div>
  );
}
