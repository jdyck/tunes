export type ArtistRecordingRelationshipReason =
  "release_group_attribution" | "attribution" | "personnel";

const relationshipReasonLabels: Record<
  Exclude<ArtistRecordingRelationshipReason, "release_group_attribution">,
  string
> = {
  attribution: "Recording Attribution",
  personnel: "Personnel",
};

export const formatArtistRecordingRelationshipReasons = (
  reasons?: readonly ArtistRecordingRelationshipReason[],
  releaseGroupTitle?: string | null,
) => {
  const label = reasons
    ?.map((reason) =>
      reason === "release_group_attribution"
        ? `Album credit${releaseGroupTitle ? `: ${releaseGroupTitle}` : ""}`
        : relationshipReasonLabels[reason],
    )
    .join(" · ");
  return label || null;
};
