export type SaveLifecycleStatus =
  | "clean"
  | "dirty"
  | "saving"
  | "recently-saved"
  | "error";

export interface SaveLifecycleState {
  revision: number;
  savedRevision: number;
  savingRevision: number | null;
  recentlySaved: boolean;
  error: string | null;
}

export type SaveLifecycleEvent =
  | { type: "reset"; dirty?: boolean }
  | { type: "edited"; revision: number }
  | { type: "save-started"; revision: number }
  | { type: "save-succeeded"; revision: number }
  | { type: "save-failed"; revision: number; error: string }
  | { type: "recently-saved-expired" };

export const createSaveLifecycleState = (
  dirty = false
): SaveLifecycleState => ({
  revision: dirty ? 1 : 0,
  savedRevision: 0,
  savingRevision: null,
  recentlySaved: false,
  error: null,
});

export const reduceSaveLifecycle = (
  state: SaveLifecycleState,
  event: SaveLifecycleEvent
): SaveLifecycleState => {
  switch (event.type) {
    case "reset":
      return createSaveLifecycleState(event.dirty);
    case "edited":
      return {
        ...state,
        revision: Math.max(state.revision, event.revision),
        recentlySaved: false,
        error: null,
      };
    case "save-started":
      return {
        ...state,
        savingRevision: event.revision,
        recentlySaved: false,
        error: null,
      };
    case "save-succeeded":
      if (state.savingRevision !== event.revision) return state;
      return {
        ...state,
        savedRevision: Math.max(state.savedRevision, event.revision),
        savingRevision: null,
        recentlySaved: state.revision === event.revision,
        error: null,
      };
    case "save-failed":
      if (state.savingRevision !== event.revision) return state;
      return {
        ...state,
        savingRevision: null,
        recentlySaved: false,
        error: event.error,
      };
    case "recently-saved-expired":
      return { ...state, recentlySaved: false };
  }
};

export const saveLifecycleIsDirty = (state: SaveLifecycleState) =>
  state.revision > state.savedRevision;

export const saveLifecycleStatus = (
  state: SaveLifecycleState
): SaveLifecycleStatus => {
  if (state.savingRevision !== null) return "saving";
  if (state.error) return "error";
  if (saveLifecycleIsDirty(state)) return "dirty";
  if (state.recentlySaved) return "recently-saved";
  return "clean";
};
