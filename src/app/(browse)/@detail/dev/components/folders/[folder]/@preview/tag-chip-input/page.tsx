"use client";

import { useState } from "react";
import TagChipInput from "@/components/ui/TagChipInput";

export default function TagChipInputDemoPage() {
  const [tags, setTags] = useState(["Ballad", "Vocal"]);

  return (
    <div className="max-w-md">
      <TagChipInput
        label="Tags"
        value={tags}
        suggestions={["Ballad", "Holiday", "Vocal", "Waltz"]}
        onChange={setTags}
      />
    </div>
  );
}
