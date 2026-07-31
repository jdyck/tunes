"use client";

import { useState } from "react";
import Switch from "@/components/ui/Switch";

export default function SwitchDemoPage() {
  const [enabled, setEnabled] = useState(false);

  return (
    <div className="flex max-w-sm flex-col gap-6">
      <label className="flex items-center gap-3">
        <Switch checked={enabled} onChange={setEnabled} />
        <span>Interactive setting</span>
      </label>

      <label className="flex items-center gap-3">
        <Switch checked disabled onChange={() => {}} />
        <span>Disabled setting</span>
      </label>
    </div>
  );
}
