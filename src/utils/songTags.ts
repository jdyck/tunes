export const tagKey = (tag: string) => tag.trim().toLocaleLowerCase();

export const normalizeTags = (
  tags: readonly string[],
  existingTags: readonly string[] = []
): string[] => {
  const existingByKey = new Map(
    existingTags
      .map((tag) => tag.trim())
      .filter(Boolean)
      .map((tag) => [tagKey(tag), tag])
  );
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of tags) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = tagKey(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(existingByKey.get(key) ?? trimmed);
  }

  return normalized;
};

export const hasTag = (
  tags: readonly string[] | null | undefined,
  target: string
): boolean => {
  const targetKey = tagKey(target);
  return (tags ?? []).some((tag) => tagKey(tag) === targetKey);
};

export const collectTags = (
  tagLists: ReadonlyArray<readonly string[] | null | undefined>
): string[] =>
  normalizeTags(tagLists.flatMap((tags) => tags ?? [])).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );
