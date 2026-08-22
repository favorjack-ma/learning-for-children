import test from "node:test";
import assert from "node:assert/strict";
import {
  createEmptyLog,
  addWatchSeconds,
  markCompleted,
  getTodaySeconds,
  getVideoSeconds,
  isVideoCompleted,
  hasEverWatched,
  resetDay,
} from "../src/watch-log.js";

test("addWatchSeconds accumulates seconds for a day and video", () => {
  let log = createEmptyLog();
  log = addWatchSeconds(log, "2026-08-22", "abc123", 30);
  log = addWatchSeconds(log, "2026-08-22", "abc123", 20);

  assert.equal(getTodaySeconds(log, "2026-08-22"), 50);
  assert.equal(getVideoSeconds(log, "2026-08-22", "abc123"), 50);
});

test("addWatchSeconds keeps separate videos and days isolated", () => {
  let log = createEmptyLog();
  log = addWatchSeconds(log, "2026-08-22", "video-a", 10);
  log = addWatchSeconds(log, "2026-08-22", "video-b", 5);
  log = addWatchSeconds(log, "2026-08-23", "video-a", 100);

  assert.equal(getTodaySeconds(log, "2026-08-22"), 15);
  assert.equal(getTodaySeconds(log, "2026-08-23"), 100);
  assert.equal(getVideoSeconds(log, "2026-08-22", "video-a"), 10);
  assert.equal(getVideoSeconds(log, "2026-08-22", "video-b"), 5);
});

test("addWatchSeconds ignores zero or negative deltas", () => {
  let log = createEmptyLog();
  log = addWatchSeconds(log, "2026-08-22", "abc123", 0);
  log = addWatchSeconds(log, "2026-08-22", "abc123", -5);

  assert.equal(getTodaySeconds(log, "2026-08-22"), 0);
});

test("addWatchSeconds never mutates the previous log object", () => {
  const log1 = createEmptyLog();
  const log2 = addWatchSeconds(log1, "2026-08-22", "abc123", 10);

  assert.deepEqual(log1, {});
  assert.notEqual(log1, log2);
});

test("markCompleted sets completed flag without resetting seconds", () => {
  let log = createEmptyLog();
  log = addWatchSeconds(log, "2026-08-22", "abc123", 30);
  log = markCompleted(log, "2026-08-22", "abc123");

  assert.equal(isVideoCompleted(log, "2026-08-22", "abc123"), true);
  assert.equal(getVideoSeconds(log, "2026-08-22", "abc123"), 30);
});

test("getVideoSeconds and isVideoCompleted default safely for unseen entries", () => {
  const log = createEmptyLog();
  assert.equal(getVideoSeconds(log, "2026-08-22", "unknown"), 0);
  assert.equal(isVideoCompleted(log, "2026-08-22", "unknown"), false);
  assert.equal(getTodaySeconds(log, "2026-08-22"), 0);
});

test("hasEverWatched finds a video logged on any day, not just today", () => {
  let log = createEmptyLog();
  log = addWatchSeconds(log, "2026-08-20", "abc123", 30);

  assert.equal(hasEverWatched(log, "abc123"), true);
  assert.equal(hasEverWatched(log, "never-seen"), false);
});

test("resetDay removes only the target day", () => {
  let log = createEmptyLog();
  log = addWatchSeconds(log, "2026-08-22", "abc123", 30);
  log = addWatchSeconds(log, "2026-08-23", "abc123", 40);

  log = resetDay(log, "2026-08-22");

  assert.equal(getTodaySeconds(log, "2026-08-22"), 0);
  assert.equal(getTodaySeconds(log, "2026-08-23"), 40);
});
