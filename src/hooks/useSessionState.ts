"use client";

import { useEffect, useState } from "react";

export const useSessionState = <T,>(
  key: string,
  initialValue: () => T,
  isValid: (value: unknown) => value is T
) => {
  const [value, setValue] = useState<T>(initialValue);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(key);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (isValid(parsed)) setValue(parsed);
      }
    } catch {
      // A corrupt or unavailable session store should not block the list.
    }
    setHydrated(true);
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Keep state in memory when storage is unavailable.
    }
  }, [hydrated, key, value]);

  return [value, setValue] as const;
};
