import test from "node:test";
import assert from "node:assert/strict";
import { isLikelyAd } from "../src/player/ad-detection.js";

test("isLikelyAd is false when reported duration exactly matches expected", () => {
  assert.equal(isLikelyAd(339, 339), false);
});

test("isLikelyAd is false within tolerance", () => {
  assert.equal(isLikelyAd(342, 339, 5), false);
  assert.equal(isLikelyAd(334, 339, 5), false);
});

test("isLikelyAd is true just outside tolerance", () => {
  assert.equal(isLikelyAd(345, 339, 5), true);
});

test("isLikelyAd is true for a short pre-roll ad before a long video", () => {
  assert.equal(isLikelyAd(15, 690, 5), true);
});

test("isLikelyAd is false when duration hasn't loaded yet (0 or falsy)", () => {
  assert.equal(isLikelyAd(0, 339), false);
  assert.equal(isLikelyAd(undefined, 339), false);
  assert.equal(isLikelyAd(null, 339), false);
});

test("isLikelyAd uses the default 5s tolerance when none is given", () => {
  assert.equal(isLikelyAd(343, 339), false);
  assert.equal(isLikelyAd(346, 339), true);
});
