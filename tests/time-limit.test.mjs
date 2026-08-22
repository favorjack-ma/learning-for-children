import test from "node:test";
import assert from "node:assert/strict";
import { addWatchSeconds, createEmptyLog } from "../src/watch-log.js";
import { getTodayDateKey, remainingSeconds, isLimitReached, usedFraction } from "../src/time-limit.js";

test("getTodayDateKey formats as YYYY-MM-DD in Asia/Seoul regardless of local timezone", () => {
  // 2026-08-22 15:30 UTC = 2026-08-23 00:30 KST (UTC+9) — crosses midnight.
  const utcInstant = new Date("2026-08-22T15:30:00Z");
  assert.equal(getTodayDateKey(utcInstant), "2026-08-23");

  // 2026-08-22 03:00 UTC = 2026-08-22 12:00 KST — same day.
  const sameDayInstant = new Date("2026-08-22T03:00:00Z");
  assert.equal(getTodayDateKey(sameDayInstant), "2026-08-22");
});

test("remainingSeconds counts down from the daily limit", () => {
  let log = createEmptyLog();
  log = addWatchSeconds(log, "2026-08-22", "abc123", 600); // 10 minutes

  assert.equal(remainingSeconds(log, "2026-08-22", 40), 40 * 60 - 600);
});

test("remainingSeconds never goes negative when usage exceeds the limit", () => {
  let log = createEmptyLog();
  log = addWatchSeconds(log, "2026-08-22", "abc123", 50 * 60); // 50 minutes used

  assert.equal(remainingSeconds(log, "2026-08-22", 40), 0);
});

test("isLimitReached flips to true exactly when remaining hits zero", () => {
  let log = createEmptyLog();
  log = addWatchSeconds(log, "2026-08-22", "abc123", 39 * 60);
  assert.equal(isLimitReached(log, "2026-08-22", 40), false);

  log = addWatchSeconds(log, "2026-08-22", "abc123", 60);
  assert.equal(isLimitReached(log, "2026-08-22", 40), true);
});

test("usedFraction is clamped to [0, 1]", () => {
  let log = createEmptyLog();
  assert.equal(usedFraction(log, "2026-08-22", 40), 0);

  log = addWatchSeconds(log, "2026-08-22", "abc123", 20 * 60);
  assert.equal(usedFraction(log, "2026-08-22", 40), 0.5);

  log = addWatchSeconds(log, "2026-08-22", "abc123", 100 * 60);
  assert.equal(usedFraction(log, "2026-08-22", 40), 1);
});
