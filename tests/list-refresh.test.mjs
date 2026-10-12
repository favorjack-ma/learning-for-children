import test from "node:test";
import assert from "node:assert/strict";
import { createListRefresher } from "../src/list-refresh.js";

function setup({ visible = true, refreshable = true, load } = {}) {
  const state = { visible, refreshable, applied: [] };
  const refresh = createListRefresher({
    load: load ?? (async () => ({ version: 2 })),
    isVisible: () => state.visible,
    canRefresh: () => state.refreshable,
    apply: (fresh) => state.applied.push(fresh),
  });
  return { state, refresh };
}

test("applies the freshly loaded list when visible on a list screen", async () => {
  const { state, refresh } = setup();
  await refresh();
  assert.deepEqual(state.applied, [{ version: 2 }]);
});

test("does not load while the app is in the background", async () => {
  let loads = 0;
  const { state, refresh } = setup({ visible: false, load: async () => (loads++, {}) });
  await refresh();
  assert.equal(loads, 0);
  assert.deepEqual(state.applied, []);
});

test("does not load while a video is playing or a PIN is being typed", async () => {
  let loads = 0;
  const { state, refresh } = setup({ refreshable: false, load: async () => (loads++, {}) });
  await refresh();
  assert.equal(loads, 0);
  assert.deepEqual(state.applied, []);
});

test("drops the result if the child started a video while the list was loading", async () => {
  let finishLoad;
  const { state, refresh } = setup({ load: () => new Promise((resolve) => (finishLoad = resolve)) });
  const pending = refresh();
  state.refreshable = false;
  finishLoad({ version: 2 });
  await pending;
  assert.deepEqual(state.applied, []);
});

test("a failed load keeps the current list and does not throw", async () => {
  const { state, refresh } = setup({
    load: async () => {
      throw new Error("offline");
    },
  });
  await refresh();
  assert.deepEqual(state.applied, []);
});

test("overlapping calls share one load instead of piling up", async () => {
  let loads = 0;
  let finishLoad;
  const { state, refresh } = setup({
    load: () => {
      loads++;
      return new Promise((resolve) => (finishLoad = resolve));
    },
  });
  const first = refresh();
  const second = refresh();
  finishLoad({ version: 2 });
  await Promise.all([first, second]);
  assert.equal(loads, 1);
  assert.deepEqual(state.applied, [{ version: 2 }]);
});
