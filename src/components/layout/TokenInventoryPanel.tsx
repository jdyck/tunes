"use client";

import { useEffect, useState } from "react";
import { useSelectedLayoutSegment } from "next/navigation";

type TokenUsage = {
  class: string;
  family: string;
  count: number;
  inTheme: boolean;
};

// Dev-gallery-only panel listing the color classes a component's source
// uses, split into @theme tokens vs raw Tailwind palettes (drift) --
// docs/direction/styling-cleanup.md, Task 1.
export default function TokenInventoryPanel() {
  const slug = useSelectedLayoutSegment();
  const [tokens, setTokens] = useState<TokenUsage[] | null>(null);

  useEffect(() => {
    if (!slug) return;
    setTokens(null);
    fetch(`/api/dev/component-tokens?slug=${slug}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setTokens(data?.tokens ?? []))
      .catch(() => setTokens([]));
  }, [slug]);

  if (!slug || tokens === null) return null;

  const drift = tokens.filter((t) => !t.inTheme);

  return (
    <div className="mt-8 border-t border-line-100 pt-4">
      <h2 className="text-xs uppercase tracking-wide text-ink-600 mb-2">
        Color tokens in source
      </h2>
      {tokens.length === 0 ? (
        <p className="text-xs text-ink-400">No color classes found.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {tokens.map((t) => (
            <li
              key={t.class}
              className={`flex items-center gap-1.5 rounded border px-1.5 py-0.5 text-xs font-mono ${
                t.inTheme ? "border-line-100 text-ink-600" : "border-mojo-600 text-mojo-600"
              }`}
              title={t.inTheme ? "@theme token" : "raw Tailwind palette (drift)"}
            >
              <span
                className="inline-block h-3 w-3 rounded-sm border border-line-100"
                style={{
                  backgroundColor: `var(--color-${t.class.replace(/^.*?(?:bg|text|border|ring|fill|stroke|outline|decoration|divide|accent|caret|from|via|to)-/, "").replace("/", "-")}, transparent)`,
                }}
              />
              {t.class}
              {t.count > 1 && <span className="text-ink-400">×{t.count}</span>}
            </li>
          ))}
        </ul>
      )}
      {drift.length > 0 && (
        <p className="mt-2 text-xs text-mojo-600">
          {drift.length} class{drift.length === 1 ? "" : "es"} outside the
          @theme palette — see docs/direction/styling-cleanup.md.
        </p>
      )}
    </div>
  );
}
