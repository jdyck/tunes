"use client";

import Link from "next/link";
import { XMarkIcon } from "@heroicons/react/20/solid";
import { usePathname } from "next/navigation";

// A nested named slot always resolves to *something* (its own page or
// default.tsx), but we only want to reserve pane width for it when the
// current URL is actually pointing into it — otherwise it collapses so the
// panel behind it gets the full remaining width. Shared by every nested
// detail panel (Recording, and now Artist/Song) so the overlay
// mechanics — slide-in width, click-outside-to-dismiss at the tablet tier,
// explicit close button hidden once there's room to show both panels — stay
// identical regardless of which entity is in the slot.
//
// The close/dismiss target is always "this slot's own matched segment, and
// everything nested inside it, dropped" — i.e. the pathname truncated right
// before matchPattern's match. That's computed here rather than threaded in
// as a prop so dismissal is correctly LIFO even when this same slot can be
// reached at more than one depth (e.g. Artist nested directly under Song, or
// nested one level deeper under a Recording under that Song) — the caller
// would otherwise have to know which depth it's currently at.
export default function NestedPaneGate({
  children,
  matchPattern,
  // Full literal class name (e.g. "z-[var(--layer-recording-detail)]"), not
  // just the var name — Tailwind's build-time scanner needs the complete
  // class string to appear somewhere in the source text; a template-string
  // rebuild from a bare var name wouldn't be picked up at build time.
  zLayerClassName,
  // A slot that can only ever be the 2nd panel next to its root (e.g.
  // Recording directly under Song) can safely go fully static at 2xl and sit
  // side by side with its root, matching pre-existing behavior. A slot that
  // can also be reached one level deeper (e.g. Artist under Song, which is
  // also reachable as Song > Recording > Artist) must never go static:
  // with three static-width panels competing for one flex row there's no
  // breakpoint wide enough to fit all of them, and the innermost one would
  // overflow off-screen instead of overlaying. Such slots pass
  // neverStatic — they stay a fixed/absolute overlay at every width.
  neverStatic = false,
}: {
  children: React.ReactNode;
  matchPattern: RegExp;
  zLayerClassName: string;
  neverStatic?: boolean;
}) {
  const pathname = usePathname();
  const matchIndex = pathname.search(matchPattern);

  if (matchIndex === -1) return null;

  const backHref = pathname.slice(0, matchIndex) || "/";
  const staticAt2xl = neverStatic
    ? ""
    : "2xl:static 2xl:inset-auto 2xl:z-auto 2xl:shadow-none";
  // The close button only hides once the pane has somewhere to go instead
  // (2xl static, sitting side by side with its root) — a neverStatic pane is
  // still an overlay at every width, so it must keep its own dismiss control.
  const closeButtonHiddenAt2xl = neverStatic ? "" : "2xl:hidden";

  return (
    <>
      <Link
        href={backHref}
        aria-hidden="true"
        tabIndex={-1}
        className={`fixed inset-0 ${zLayerClassName} hidden cursor-default lg:block xl:hidden`}
      />
      <div
        className={`fixed inset-x-0 top-0 bottom-0 ${zLayerClassName} overscroll-none bg-surface-app lg:absolute lg:left-auto lg:right-0 lg:top-0 lg:bottom-0 lg:block lg:h-full lg:w-sm lg:border-l lg:border-paper-600 lg:shadow-[-12px_0_24px_rgba(32,29,27,0.12)] xl:w-md ${staticAt2xl}`}
      >
        <Link
          href={backHref}
          aria-label="Close details pane"
          className={`absolute left-4 top-4 z-10 hidden rounded-md p-1 text-ink-600 hover:bg-paper-100 hover:text-ink-900 lg:block ${closeButtonHiddenAt2xl}`}
        >
          <XMarkIcon className="h-6 w-6" />
        </Link>
        {children}
      </div>
    </>
  );
}
