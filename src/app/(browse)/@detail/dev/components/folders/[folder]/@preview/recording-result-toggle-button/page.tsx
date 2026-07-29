"use client";

import { useState } from "react";
import RecordingResultToggleButton, {
  RecordingResultPendingState,
} from "@/components/recording/RecordingResultToggleButton";

export default function RecordingResultToggleButtonDemoPage() {
  const [saved, setSaved] = useState(false);
  const states: Array<{
    label: string;
    saved: boolean;
    pending: RecordingResultPendingState;
  }> = [
    { label: "Not saved", saved: false, pending: null },
    { label: "Saved", saved: true, pending: null },
    { label: "Saving", saved: false, pending: "saving" },
    { label: "Removing", saved: true, pending: "removing" },
  ];

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 font-semibold">Interactive</h2>
        <div className="flex items-center gap-3">
          <RecordingResultToggleButton
            saved={saved}
            pending={null}
            onToggle={() => setSaved((current) => !current)}
          />
          <span>{saved ? "Saved" : "Not saved"}</span>
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">States</h2>
        <div className="flex flex-wrap gap-6">
          {states.map((state) => (
            <div key={state.label} className="flex flex-col items-center gap-1">
              <RecordingResultToggleButton
                saved={state.saved}
                pending={state.pending}
                onToggle={() => undefined}
              />
              <span className="text-sm text-ink-600">{state.label}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
