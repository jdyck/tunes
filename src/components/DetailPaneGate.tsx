"use client";

import { usePathname } from "next/navigation";

// The @detail slot doesn't reliably fall back to its own default.tsx when
// push-navigating away from /song/[id] (a Next.js parallel-routes
// limitation — pop/back navigation resolves it fine, push doesn't), so we
// gate on pathname directly instead of trusting whatever content Next
// hands us for the slot. Mirrors the same pattern RecordingPaneWrapper
// already uses for @recording.
export default function DetailPaneGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hasSong = /^\/song\//.test(pathname);

  if (!hasSong) {
    return (
      <div className="hidden lg:flex lg:w-full lg:h-full lg:items-center lg:justify-center p-8 text-center text-ink-400">
        <p>Choose a song, or add a song to get started.</p>
      </div>
    );
  }

  return <>{children}</>;
}
