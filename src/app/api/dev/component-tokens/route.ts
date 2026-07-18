import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { componentRegistry } from "@/lib/componentRegistry";

// Static scan, not a runtime one: dynamically-constructed class names are
// missed, which is acceptable for an at-a-glance inventory
// (docs/direction/styling-cleanup.md, Task 1).
const COLOR_CLASS =
  /(?:^|[\s"'`{])((?:hover:|focus:|active:|disabled:|group-hover:)*(?:bg|text|border|ring|fill|stroke|outline|decoration|divide|accent|caret|from|via|to)-([a-z]+)(?:-(\d{2,3}|default|app))?(?:\/\d{1,3})?)(?=[\s"'`}$])/g;

// Utility prefixes that share color-class syntax but aren't colors.
const NOT_COLORS = new Set([
  "center", "left", "right", "justify", "start", "end", "clip", "cover",
  "contain", "fixed", "local", "scroll", "top", "bottom", "wrap", "nowrap",
  "ellipsis", "balance", "pretty", "middle", "baseline", "sub", "super",
  "none", "auto", "solid", "dashed", "dotted", "double", "underline",
  "collapse", "transparent", "current", "inherit",
  // sizes / widths / sides, not colors
  "xs", "sm", "base", "lg", "xl", "t", "b", "l", "r", "x", "y", "s", "e",
]);

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const slug = request.nextUrl.searchParams.get("slug");
  const entry = componentRegistry.find((c) => c.slug === slug);
  if (!entry) {
    return NextResponse.json({ error: "Unknown component" }, { status: 404 });
  }

  const root = process.cwd();
  const [source, globals] = await Promise.all([
    fs.readFile(path.join(root, entry.path), "utf8"),
    fs.readFile(path.join(root, "src/app/globals.css"), "utf8"),
  ]);

  // Families declared in the @theme block are "ours"; any other palette a
  // class references is a raw Tailwind default -- i.e. styling drift.
  const themeFamilies = new Set(
    [...globals.matchAll(/--color-([a-z]+)/g)].map((m) => m[1])
  );

  const counts = new Map<string, { count: number; family: string }>();
  for (const match of source.matchAll(COLOR_CLASS)) {
    const [, cls, family] = match;
    if (NOT_COLORS.has(family)) continue;
    const existing = counts.get(cls);
    if (existing) existing.count += 1;
    else counts.set(cls, { count: 1, family });
  }

  const tokens = [...counts.entries()]
    .map(([cls, { count, family }]) => ({
      class: cls,
      family,
      count,
      inTheme: themeFamilies.has(family),
    }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({ component: entry.name, path: entry.path, tokens });
}
