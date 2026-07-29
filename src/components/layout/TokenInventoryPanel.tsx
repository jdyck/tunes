"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  componentRegistry,
  getComponentFromGalleryPathname,
  getComponentGalleryHref,
} from "@/lib/componentRegistry";

type TokenUsage = {
  class: string;
  family: string;
  count: number;
  inTheme: boolean;
};

type ChildComponent = {
  name: string;
  path: string;
  slug: string | null;
};

// Dev-gallery-only panel listing the color classes a component's source
// uses, split into @theme tokens vs raw Tailwind palettes (drift) --
// docs/direction/styling-cleanup.md, Task 1.
export default function TokenInventoryPanel() {
  const pathname = usePathname();
  const slug = getComponentFromGalleryPathname(pathname)?.slug;
  const [tokens, setTokens] = useState<TokenUsage[] | null>(null);
  const [childComponents, setChildComponents] = useState<
    ChildComponent[] | null
  >(null);

  useEffect(() => {
    if (!slug) return;
    setTokens(null);
    setChildComponents(null);
    fetch(`/api/dev/component-tokens?slug=${slug}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setTokens(data?.tokens ?? []);
        setChildComponents(data?.childComponents ?? []);
      })
      .catch(() => {
        setTokens([]);
        setChildComponents([]);
      });
  }, [slug]);

  if (!slug || tokens === null || childComponents === null) return null;

  const drift = tokens.filter((t) => !t.inTheme);

  return (
    <div className="mt-8 space-y-5 border-t border-line-100 pt-4">
      <section>
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
      </section>

      <section>
        <h2 className="mb-2 text-xs uppercase tracking-wide text-ink-600">
          Child components in source
        </h2>
        {childComponents.length === 0 ? (
          <p className="text-xs text-ink-400">No child components found.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {childComponents.map((component) => (
              <li key={component.path}>
                {component.slug ? (
                  <Link
                    href={getComponentGalleryHref(
                      getRegistryEntry(component.slug),
                    )}
                    className="inline-flex rounded border border-line-100 px-1.5 py-0.5 font-mono text-xs text-azure-700 hover:bg-old-lace-100"
                    title={component.path}
                  >
                    {component.name}
                  </Link>
                ) : (
                  <span
                    className="inline-flex rounded border border-line-100 px-1.5 py-0.5 font-mono text-xs text-ink-600"
                    title={`${component.path} (not in component library)`}
                  >
                    {component.name}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function getRegistryEntry(slug: string) {
  const component = componentRegistry.find((entry) => entry.slug === slug);
  if (!component) {
    throw new Error(`Missing component registry entry for ${slug}`);
  }
  return component;
}
