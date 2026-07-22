"use client";

import { usePlayer } from "@/components/player/GlobalPlayer";
import PrimaryButton from "@/components/ui/PrimaryButton";

export default function GlobalPlayerDemoPage() {
  const { play } = usePlayer();

  return (
    <div>
      <p className="text-sm text-ink-600 mb-4 max-w-md">
        GlobalPlayer is mounted once at the root layout, not rendered per-page
        — it&apos;s already wrapping this whole viewer. Press play to see the
        persistent bar at the bottom of the screen come to life.
      </p>
      <PrimaryButton
        className="px-3 py-2"
        onClick={() =>
          play({
            name: "Me at the zoo",
            artist: "jawed",
            youtubeVideoId: "jNQXAC9IVRw",
            kind: "released",
          })
        }
      >
        Play sample track
      </PrimaryButton>
    </div>
  );
}
