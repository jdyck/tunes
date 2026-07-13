"use client";

import { useState } from "react";
import WikipediaBackgroundCard from "@/components/WikipediaBackgroundCard";

const extract =
  '"Autumn Leaves" is the English-language lyrical adaptation of the French song "Les Feuilles mortes" composed by Joseph Kosma in 1945.';

export default function WikipediaBackgroundCardDemoPage() {
  const [removed, setRemoved] = useState(false);

  return (
    <div className="flex flex-col gap-6 max-w-md">
      <div>
        <p className="text-xs text-ink-600 mb-2">Editable (with remove)</p>
        {removed ? (
          <button
            type="button"
            onClick={() => setRemoved(false)}
            className="text-xs text-teal-700 underline"
          >
            Restore
          </button>
        ) : (
          <WikipediaBackgroundCard
            extract={extract}
            url="https://en.wikipedia.org/wiki/Autumn_Leaves_(song)"
            onRemove={() => setRemoved(true)}
          />
        )}
      </div>

      <div>
        <p className="text-xs text-ink-600 mb-2">Read-only preview</p>
        <WikipediaBackgroundCard
          extract={extract}
          url="https://en.wikipedia.org/wiki/Autumn_Leaves_(song)"
          className="p-3 rounded-md border border-line-200"
        />
      </div>
    </div>
  );
}
