"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { PencilIcon, StarIcon as SolidStarIcon } from "@heroicons/react/20/solid";
import { StarIcon as OutlineStarIcon } from "@heroicons/react/24/outline";
import { leagueGothic } from "@/lib/fonts";
import { WriterInput } from "@/lib/songWriters";
import { SavedRecording } from "@/types/types";
import { recordingArtwork } from "@/utils/recordingArtwork";
import SongWriterCredits from "@/components/song/SongWriterCredits";
import RecordingThumbnail from "@/components/recording/RecordingThumbnail";
import PaneHeader from "@/components/layout/PaneHeader";

const normalizeTitleText = (value: string) =>
  value.replace(/\u00a0/g, " ").replace(/\s*\n\s*/g, " ");

const TITLE_MAX_FONT_PX = 60;
const TITLE_MIN_FONT_PX = 20;
const TITLE_LINE_HEIGHT_RATIO = 0.93;
const TITLE_MAX_LINES = 3;

// Long titles otherwise overflow to 6-7 lines at the display size — shrink
// the (fixed-height, unitless) line-height in step with font-size so it
// keeps scaling together, then binary-search down until it fits 3 lines.
const fitTitleFontSize = (element: HTMLElement) => {
  element.style.lineHeight = `${TITLE_LINE_HEIGHT_RATIO}`;

  let low = TITLE_MIN_FONT_PX;
  let high = TITLE_MAX_FONT_PX;
  let best = TITLE_MIN_FONT_PX;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    element.style.fontSize = `${mid}px`;
    const maxHeight = mid * TITLE_LINE_HEIGHT_RATIO * TITLE_MAX_LINES;

    if (element.scrollHeight <= maxHeight + 1) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  element.style.fontSize = `${best}px`;
};

export default function SongDetailHeader({
  title,
  titleEditsPrivate,
  writers,
  songId,
  canEditShared,
  firstRecording,
  favorite,
  onTitleChange,
  onToggleFavorite,
  onEditWriters,
  backHref,
  backLabel,
}: {
  title: string;
  titleEditsPrivate: boolean;
  writers: WriterInput[];
  songId: string;
  canEditShared: boolean;
  firstRecording?: SavedRecording;
  favorite: boolean;
  onTitleChange: (title: string) => void;
  onToggleFavorite: (favorite: boolean) => void;
  onEditWriters: () => void;
  backHref: string;
  backLabel: string;
}) {
  const titleRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const titleElement = titleRef.current;
    if (!titleElement) return;
    if (titleElement.textContent !== title) titleElement.textContent = title;

    fitTitleFontSize(titleElement);
    // The title element doesn't exist while loading; re-run once it mounts.
  }, [title]);

  useEffect(() => {
    const titleElement = titleRef.current;
    if (!titleElement) return;

    const handleResize = () => fitTitleFontSize(titleElement);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const artwork = firstRecording
    ? recordingArtwork(firstRecording)
    : { src: null, fallbackSrc: null };

  return (
    <PaneHeader backHref={backHref} backLabel={backLabel} safeAreaTop>
      <div className="flex gap-4 w-xl max-w-full lg:max-w-md pb-8 items-center">
        <div className="w-full">
          <div
            ref={titleRef}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-label={titleEditsPrivate ? "Your Song title" : "Song title"}
            onInput={(event) =>
              onTitleChange(normalizeTitleText(event.currentTarget.textContent ?? ""))
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") event.preventDefault();
            }}
            onPaste={(event) => {
              event.preventDefault();
              const text = event.clipboardData
                .getData("text/plain")
                .replace(/\s*\n\s*/g, " ");
              document.execCommand("insertText", false, text);
            }}
            className={`wrap-break-word text-balance text-6xl uppercase leading-14 bg-transparent outline-none ${leagueGothic.className} tracking-wide mb-2`}
          >
            {title}
          </div>

          <div className="flex items-start gap-2 pb-4">
            <div className="min-w-0 font-bold text-lg/5 text-balance text-azure-600">
              <SongWriterCredits writers={writers} songId={songId} />
            </div>
            {canEditShared && (
              <button
                type="button"
                onClick={onEditWriters}
                aria-label="Edit writers"
                className="shrink-0 rounded-sm p-1 text-azure-600 hover:bg-paper-200 hover:text-azure-500"
              >
                <PencilIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
        <div className="grow-0 w-40 self-start">
          {firstRecording ? (
            <RecordingThumbnail
              src={artwork.src}
              fallbackSrc={artwork.fallbackSrc}
              alt=""
              className="aspect-square w-36"
            />
          ) : (
            <div className="aspect-square bg-ink-500/10 w-36" />
          )}
          <button
            type="button"
            aria-pressed={favorite}
            aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
            onClick={() => onToggleFavorite(!favorite)}
            className="mt-2 flex w-36 justify-center rounded-sm p-1 text-vermillion-600 hover:bg-paper-200"
          >
            {favorite ? (
              <SolidStarIcon className="h-7 w-7" />
            ) : (
              <OutlineStarIcon className="h-7 w-7" />
            )}
          </button>
        </div>
      </div>
    </PaneHeader>
  );
}
