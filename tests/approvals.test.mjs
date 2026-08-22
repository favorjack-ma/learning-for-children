import test from "node:test";
import assert from "node:assert/strict";
import {
  createEmptyOverrides,
  approve,
  revoke,
  isApproved,
  withEffectiveApproval,
} from "../src/approvals.js";
import { filterApproved } from "../src/data.js";

function video(overrides = {}) {
  return {
    videoId: "PBn7iWzrKoI",
    title: "What caused the French Revolution?",
    channel: "TED-Ed",
    lang: "en",
    durationSec: 339,
    approved: false,
    verifiedAt: "2026-08-22",
    ...overrides,
  };
}

test("isApproved is true when the static flag is true, regardless of overrides", () => {
  assert.equal(isApproved(video({ approved: true }), createEmptyOverrides()), true);
});

test("isApproved is true when an override exists even if the static flag is false", () => {
  const overrides = approve(createEmptyOverrides(), "PBn7iWzrKoI");
  assert.equal(isApproved(video({ approved: false }), overrides), true);
});

test("isApproved is false with no override and a false static flag", () => {
  assert.equal(isApproved(video({ approved: false }), createEmptyOverrides()), false);
});

test("revoke removes an override without touching others", () => {
  let overrides = approve(createEmptyOverrides(), "a");
  overrides = approve(overrides, "b");
  overrides = revoke(overrides, "a");

  assert.deepEqual(overrides, { b: true });
});

test("withEffectiveApproval + filterApproved surfaces an override-approved video to the child view", () => {
  const data = {
    schemaVersion: 1,
    settings: { dailyLimitMinutes: 40, parentPinSet: false },
    topics: [
      {
        id: "civil-revolutions",
        title: "시민혁명",
        sections: [{ label: "1단계", videos: [video({ approved: false })] }],
      },
    ],
  };

  const overrides = approve(createEmptyOverrides(), "PBn7iWzrKoI");
  const visible = filterApproved(withEffectiveApproval(data, overrides));

  assert.equal(visible.topics.length, 1);
  assert.equal(visible.topics[0].sections[0].videos[0].videoId, "PBn7iWzrKoI");
});

test("withEffectiveApproval never mutates the input data", () => {
  const data = {
    schemaVersion: 1,
    settings: { dailyLimitMinutes: 40, parentPinSet: false },
    topics: [
      {
        id: "civil-revolutions",
        title: "시민혁명",
        sections: [{ label: "1단계", videos: [video({ approved: false })] }],
      },
    ],
  };

  withEffectiveApproval(data, approve(createEmptyOverrides(), "PBn7iWzrKoI"));
  assert.equal(data.topics[0].sections[0].videos[0].approved, false);
});
