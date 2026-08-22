import test from "node:test";
import assert from "node:assert/strict";
import { formatTime } from "../src/player/controls.js";

test("formatTime pads seconds under 10", () => {
  assert.equal(formatTime(65), "1:05");
});

test("formatTime handles exactly zero", () => {
  assert.equal(formatTime(0), "0:00");
});

test("formatTime floors fractional seconds", () => {
  assert.equal(formatTime(59.9), "0:59");
});

test("formatTime treats negative/undefined input as zero", () => {
  assert.equal(formatTime(-5), "0:00");
  assert.equal(formatTime(undefined), "0:00");
});

test("formatTime handles durations over an hour in minutes", () => {
  assert.equal(formatTime(3661), "61:01");
});
