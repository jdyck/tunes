"use client";

import { useState } from "react";
import FormField from "@/components/ui/FormField";

export default function FormFieldDemoPage() {
  const [artist, setArtist] = useState("Ella Fitzgerald");
  const [name, setName] = useState("");

  return (
    <div className="flex flex-col gap-6 max-w-sm">
      <div>
        <p className="text-xs text-ink-600 mb-2">Detail-view style (default)</p>
        <FormField
          label="Artist"
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
        />
      </div>

      <div>
        <p className="text-xs text-ink-600 mb-2">Modal style</p>
        <FormField
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="block mb-2"
          labelClassName="block text-sm mb-1"
          inputClassName="block w-full p-2 rounded-md border border-line-200"
          autoFocus
        />
      </div>
    </div>
  );
}
