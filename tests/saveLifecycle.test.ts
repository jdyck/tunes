import assert from "node:assert/strict";
import test from "node:test";
import {
  createSaveLifecycleState,
  reduceSaveLifecycle,
  saveLifecycleIsDirty,
  saveLifecycleStatus,
} from "../src/utils/saveLifecycle.ts";

test("moves from clean through dirty, saving, recently saved, and clean", () => {
  let state = createSaveLifecycleState();
  assert.equal(saveLifecycleStatus(state), "clean");

  state = reduceSaveLifecycle(state, { type: "edited", revision: 1 });
  assert.equal(saveLifecycleStatus(state), "dirty");

  state = reduceSaveLifecycle(state, { type: "save-started", revision: 1 });
  assert.equal(saveLifecycleStatus(state), "saving");

  state = reduceSaveLifecycle(state, { type: "save-succeeded", revision: 1 });
  assert.equal(saveLifecycleIsDirty(state), false);
  assert.equal(saveLifecycleStatus(state), "recently-saved");

  state = reduceSaveLifecycle(state, { type: "recently-saved-expired" });
  assert.equal(saveLifecycleStatus(state), "clean");
});

test("keeps a newer edit dirty when an older save succeeds", () => {
  let state = createSaveLifecycleState();
  state = reduceSaveLifecycle(state, { type: "edited", revision: 1 });
  state = reduceSaveLifecycle(state, { type: "save-started", revision: 1 });
  state = reduceSaveLifecycle(state, { type: "edited", revision: 2 });
  state = reduceSaveLifecycle(state, { type: "save-succeeded", revision: 1 });

  assert.equal(state.savedRevision, 1);
  assert.equal(state.revision, 2);
  assert.equal(state.recentlySaved, false);
  assert.equal(saveLifecycleStatus(state), "dirty");
});

test("failed saves remain dirty and expose a retryable error state", () => {
  let state = createSaveLifecycleState();
  state = reduceSaveLifecycle(state, { type: "edited", revision: 1 });
  state = reduceSaveLifecycle(state, { type: "save-started", revision: 1 });
  state = reduceSaveLifecycle(state, {
    type: "save-failed",
    revision: 1,
    error: "Network unavailable",
  });

  assert.equal(saveLifecycleIsDirty(state), true);
  assert.equal(saveLifecycleStatus(state), "error");
  assert.equal(state.error, "Network unavailable");
});

test("ignores stale save completions", () => {
  let state = createSaveLifecycleState();
  state = reduceSaveLifecycle(state, { type: "edited", revision: 1 });
  state = reduceSaveLifecycle(state, { type: "save-started", revision: 1 });

  assert.equal(
    reduceSaveLifecycle(state, { type: "save-succeeded", revision: 0 }),
    state
  );
});
