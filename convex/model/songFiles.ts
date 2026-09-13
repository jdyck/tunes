export const sanitizeFileName = (value: string) => {
  const withoutControls = value.replace(/[\u0000-\u001f\u007f]/g, "");
  const withoutPathCharacters = withoutControls.replace(/[\\/:*?"<>|]/g, "-");
  const compacted = withoutPathCharacters.replace(/\s+/g, " ").trim();
  return (compacted || "song-file").slice(0, 180);
};
