import { useCallback } from "react";

export function useFieldChange(setIsSaved: (saved: boolean) => void) {
  return useCallback(
    (setter: (value: string) => void) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setter(e.target.value);
        setIsSaved(false);
      },
    [setIsSaved]
  );
}
