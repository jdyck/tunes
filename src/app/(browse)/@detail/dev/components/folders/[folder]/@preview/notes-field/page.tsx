"use client";

import { useState } from "react";
import NotesField from "@/components/ui/NotesField";

export default function NotesFieldDemoPage() {
  const [songNotes, setSongNotes] = useState("");
  const [recordingNotes, setRecordingNotes] = useState("");

  return (
    <div className="flex flex-col gap-6 max-w-sm">
      <div>
        <p className="text-xs text-ink-600 mb-2">Song detail style</p>
        <NotesField
          label="Notes"
          value={songNotes}
          onChange={(e) => setSongNotes(e.target.value)}
          rows={6}
          placeholder="Notes"
          className="w-full p-1.5 rounded-md mb-4 mt-3"
        />
      </div>

      <div>
        <p className="text-xs text-ink-600 mb-2">Recording detail style</p>
        <NotesField
          label="Notes"
          value={recordingNotes}
          onChange={(e) => setRecordingNotes(e.target.value)}
          rows={10}
          placeholder="Add notes here"
        />
      </div>
    </div>
  );
}
