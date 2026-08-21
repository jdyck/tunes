export type ArtistRecordingRelationshipReason = "attribution" | "personnel";

const relationshipReasonLabels: Record<
  ArtistRecordingRelationshipReason,
  string
> = {
  attribution: "Recording Attribution",
  personnel: "Personnel",
};

export const formatArtistRecordingRelationshipReasons = (
  reasons?: readonly ArtistRecordingRelationshipReason[],
) => {
  const label = reasons?.map((reason) => relationshipReasonLabels[reason]).join(" · ");
  return label || null;
};
