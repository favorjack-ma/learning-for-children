import test from "node:test";
import assert from "node:assert/strict";
import { slugify, generateTopicId, upsertVideo, TopicsStoreError } from "../tools/lib/topics-store.mjs";

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

test("slugify keeps ASCII words and hyphenates spaces", () => {
  assert.equal(slugify("Space Exploration"), "space-exploration");
  assert.equal(slugify("  Multiple   Spaces  "), "multiple-spaces");
});

test("slugify returns empty string for non-Latin titles", () => {
  assert.equal(slugify("우주 탐사"), "");
});

test("generateTopicId prefers explicit id over slug", () => {
  assert.equal(generateTopicId("Space Exploration", "space-explore"), "space-explore");
});

test("generateTopicId falls back to a random id when slug is empty", () => {
  const id = generateTopicId("우주 탐사");
  assert.match(id, /^topic-[0-9a-f]{6}$/);
});

test("upsertVideo creates a new topic and section when neither exists", () => {
  const data = { schemaVersion: 1, settings: { dailyLimitMinutes: 40, parentPinSet: false }, topics: [] };

  const result = upsertVideo(data, {
    topicId: "civil-revolutions",
    topicTitle: "시민혁명",
    topicEmoji: "🏛️",
    sectionLabel: "1단계 · 한국어",
    video: video(),
  });

  assert.equal(result.topics.length, 1);
  assert.equal(result.topics[0].id, "civil-revolutions");
  assert.equal(result.topics[0].sections.length, 1);
  assert.equal(result.topics[0].sections[0].videos[0].videoId, "PBn7iWzrKoI");
});

test("upsertVideo appends to an existing section rather than duplicating it", () => {
  const data = {
    schemaVersion: 1,
    settings: { dailyLimitMinutes: 40, parentPinSet: false },
    topics: [
      {
        id: "civil-revolutions",
        title: "시민혁명",
        sections: [{ label: "1단계", videos: [video({ videoId: "IIDfZ-8o4jE" })] }],
      },
    ],
  };

  const result = upsertVideo(data, {
    topicId: "civil-revolutions",
    topicTitle: "시민혁명",
    sectionLabel: "1단계",
    video: video({ videoId: "xZSDBIXDaiU" }),
  });

  assert.equal(result.topics.length, 1);
  assert.equal(result.topics[0].sections.length, 1);
  assert.equal(result.topics[0].sections[0].videos.length, 2);
});

test("upsertVideo creates a new section inside an existing topic", () => {
  const data = {
    schemaVersion: 1,
    settings: { dailyLimitMinutes: 40, parentPinSet: false },
    topics: [
      {
        id: "civil-revolutions",
        title: "시민혁명",
        sections: [{ label: "1단계", videos: [video({ videoId: "IIDfZ-8o4jE" })] }],
      },
    ],
  };

  const result = upsertVideo(data, {
    topicId: "civil-revolutions",
    topicTitle: "시민혁명",
    sectionLabel: "2단계",
    video: video({ videoId: "xZSDBIXDaiU" }),
  });

  assert.equal(result.topics[0].sections.length, 2);
  assert.equal(result.topics[0].sections[1].label, "2단계");
});

test("upsertVideo rejects a videoId that already exists anywhere in the data", () => {
  const data = {
    schemaVersion: 1,
    settings: { dailyLimitMinutes: 40, parentPinSet: false },
    topics: [
      {
        id: "civil-revolutions",
        title: "시민혁명",
        sections: [{ label: "1단계", videos: [video({ videoId: "IIDfZ-8o4jE" })] }],
      },
    ],
  };

  assert.throws(
    () =>
      upsertVideo(data, {
        topicId: "space",
        topicTitle: "우주",
        sectionLabel: "1단계",
        video: video({ videoId: "IIDfZ-8o4jE" }),
      }),
    TopicsStoreError
  );
});

test("upsertVideo never mutates the input data", () => {
  const data = { schemaVersion: 1, settings: { dailyLimitMinutes: 40, parentPinSet: false }, topics: [] };
  upsertVideo(data, {
    topicId: "civil-revolutions",
    topicTitle: "시민혁명",
    sectionLabel: "1단계",
    video: video(),
  });
  assert.deepEqual(data.topics, []);
});
