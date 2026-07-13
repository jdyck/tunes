"use client";

import { useState } from "react";
import SongWritersEditor from "@/components/SongWritersEditor";
import { WriterInput } from "@/utils/songWriters";

export default function SongWritersEditorDemoPage() {
  const [writers, setWriters] = useState<WriterInput[]>([
    { name: "Joseph Kosma", role: "composer" },
    { name: "Jacques Prévert", role: "lyricist" },
  ]);

  return (
    <div className="max-w-md">
      <SongWritersEditor value={writers} onChange={setWriters} />
    </div>
  );
}
