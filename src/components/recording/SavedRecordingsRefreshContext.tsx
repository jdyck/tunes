"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

const SavedRecordingsRefreshContext = createContext({
  revision: 0,
  requestRefresh: () => {},
});

export function SavedRecordingsRefreshProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [revision, setRevision] = useState(0);
  const requestRefresh = useCallback(() => {
    setRevision((current) => current + 1);
  }, []);
  const value = useMemo(
    () => ({ revision, requestRefresh }),
    [revision, requestRefresh]
  );

  return (
    <SavedRecordingsRefreshContext.Provider value={value}>
      {children}
    </SavedRecordingsRefreshContext.Provider>
  );
}

export const useSavedRecordingsRefresh = () =>
  useContext(SavedRecordingsRefreshContext);
