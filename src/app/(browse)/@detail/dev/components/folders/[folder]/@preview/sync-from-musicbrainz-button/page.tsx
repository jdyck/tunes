"use client";

import { useState } from "react";
import SyncFromMusicBrainzButton from "@/components/ui/SyncFromMusicBrainzButton";

export default function SyncFromMusicBrainzButtonDemoPage() {
  const [syncing, setSyncing] = useState(false);

  return (
    <SyncFromMusicBrainzButton
      syncing={syncing}
      onClick={() => {
        setSyncing(true);
        setTimeout(() => setSyncing(false), 1500);
      }}
    />
  );
}
