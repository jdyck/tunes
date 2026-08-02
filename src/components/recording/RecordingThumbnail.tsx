"use client";

import { useEffect, useState } from "react";
import { MusicalNoteIcon } from "@heroicons/react/20/solid";

// Shown in place of a recording/video thumbnail whenever the API didn't
// return one or the returned URL fails to load, rather than leaving a gap
// where the image would be. `className` controls sizing so callers can fit
// it into their own layout (fixed px box, w-full h-full, etc).
export default function RecordingThumbnail({
  src,
  fallbackSrc,
  alt = "",
  className = "",
}: {
  src?: string | null;
  fallbackSrc?: string | null;
  alt?: string;
  className?: string;
}) {
  const [failedPrimary, setFailedPrimary] = useState(false);
  const [failedFallback, setFailedFallback] = useState(false);
  useEffect(() => {
    setFailedPrimary(false);
    setFailedFallback(false);
  }, [src, fallbackSrc]);
  const activeSrc = failedPrimary ? fallbackSrc : src;

  if (!activeSrc || failedFallback) {
    return (
      <div
        className={`flex items-center justify-center bg-paper-200 ${className}`}
      >
        {/* Sized as a fraction of the box rather than a fixed 20px, so the
            note stays proportional whether it's a list row or the much larger
            Song header. A quarter of an 80px row box is the original 20px. */}
        <MusicalNoteIcon className="h-1/4 w-1/4 text-ink-400" />
      </div>
    );
  }

  return (
    <img
      src={activeSrc}
      alt={alt}
      className={`object-cover ${className}`}
      onError={() => {
        if (!failedPrimary && fallbackSrc) setFailedPrimary(true);
        else setFailedFallback(true);
      }}
    />
  );
}
