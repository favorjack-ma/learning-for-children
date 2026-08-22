import test from "node:test";
import assert from "node:assert/strict";
import { createEmptyRemovals, remove, restore, isRemoved, withRemovalsApplied } from "../src/removals.js";

function video(overrides = {}) {
  return {
    videoId: "PBn7iWzrKoI",
    title: "What caused the French Revolution?",
    channel: "TED-Ed",
    lang: "en",
    durationSec: 339,
    approved: true,
    verifiedAt: "2026-08-22",
    ...overrides,
  };
}

function dataWithVideos(videos) {
  return {
    schemaVersion: 1,
    settings: { dailyLimitMinutes: 40, parentPinSet: false },
    profiles: ["형"],
    topics: [
      {
        id: "civil-revolutions",
        profile: "형",
        title: "시민혁명",
        sections: [{ label: "1단계", videos }],
      },
    ],
  };
}

test("isRemoved is false by default", () => {
  assert.equal(isRemoved(video(), createEmptyRemovals()), false);
});

test("remove then isRemoved is true", () => {
  const removals = remove(createEmptyRemovals(), "PBn7iWzrKoI");
  assert.equal(isRemoved(video(), removals), true);
});

test("restore undoes a removal without touching others", () => {
  let removals = remove(createEmptyRemovals(), "a");
  removals = remove(removals, "b");
  removals = restore(removals, "a");
  assert.deepEqual(removals, { b: true });
});

test("withRemovalsApplied filters out a removed video and drops emptied section/topic", () => {
  const data = dataWithVideos([video({ videoId: "PBn7iWzrKoI" })]);
  const removals = remove(createEmptyRemovals(), "PBn7iWzrKoI");

  const result = withRemovalsApplied(data, removals);

  assert.equal(result.topics.length, 0);
});

test("withRemovalsApplied keeps a non-removed video", () => {
  const data = dataWithVideos([
    video({ videoId: "PBn7iWzrKoI" }),
    video({ videoId: "IIDfZ-8o4jE" }),
  ]);
  const removals = remove(createEmptyRemovals(), "PBn7iWzrKoI");

  const result = withRemovalsApplied(data, removals);

  assert.equal(result.topics[0].sections[0].videos.length, 1);
  assert.equal(result.topics[0].sections[0].videos[0].videoId, "IIDfZ-8o4jE");
});

test("withRemovalsApplied never mutates the input", () => {
  const data = dataWithVideos([video({ videoId: "PBn7iWzrKoI" })]);
  withRemovalsApplied(data, remove(createEmptyRemovals(), "PBn7iWzrKoI"));
  assert.equal(data.topics[0].sections[0].videos.length, 1);
});
