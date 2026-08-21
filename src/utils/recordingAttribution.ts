export interface RecordingAttributionDisplayPart {
  credited_as: string;
  join_phrase: string;
  sort_order?: number | null;
}

export const formatRecordingAttribution = (
  attribution: readonly RecordingAttributionDisplayPart[],
): string | null => {
  if (attribution.length === 0) return null;

  return [...attribution]
    .sort(
      (left, right) =>
        (left.sort_order ?? Number.MAX_SAFE_INTEGER) -
        (right.sort_order ?? Number.MAX_SAFE_INTEGER),
    )
    .map((part) => `${part.credited_as}${part.join_phrase}`)
    .join("");
};

export const formatRecordingArtistDisplay = ({
  attribution,
  fallback,
  providerHint,
  descriptor,
}: {
  attribution: readonly RecordingAttributionDisplayPart[];
  fallback: string | null | undefined;
  providerHint: string | null | undefined;
  descriptor: string;
}): string => {
  const fallbackText = fallback?.trim() || null;
  const providerText = providerHint?.trim() || null;
  return (
    formatRecordingAttribution(attribution) ??
    fallbackText ??
    providerText ??
    descriptor
  );
};
