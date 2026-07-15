"use client";

import { useState } from "react";
import { MusicalNoteIcon } from "@heroicons/react/20/solid";

// Shown in place of a recording/video thumbnail whenever the API didn't
// return one or the returned URL fails to load, rather than leaving a gap
// where the image would be. `className` controls sizing so callers can fit
// it into their own layout (fixed px box, w-full h-full, etc).
export default function RecordingThumbnail({
  src,
  alt = "",
  className = "",
}: {
  src?: string | null;
  alt?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex items-center justify-center bg-merino-200 ${className}`}
      >
        <MusicalNoteIcon className="h-5 w-5 text-ink-400" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`object-cover ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
