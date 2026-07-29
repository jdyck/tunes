"use client";

import { useState } from "react";
import SongWritersEditor from "@/components/song/SongWritersEditor";
import { WriterInput } from "@/lib/songWriters";

export default function SongWritersEditorDemoPage() {
  const [writers, setWriters] = useState<WriterInput[]>([
    { creditedAs: "Joseph Kosma", role: "composer" },
    { creditedAs: "Jacques Prévert", role: "lyricist" },
  ]);

  return (
    <div className="max-w-md">
      <SongWritersEditor value={writers} onChange={setWriters} />
    </div>
  );
}
