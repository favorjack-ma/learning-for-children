import test from "node:test";
import assert from "node:assert/strict";
import {
  slugify,
  generateTopicId,
  upsertVideo,
  setVideoApproval,
  removeVideo,
  TopicsStoreError,
} from "../tools/lib/topics-store.mjs";

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
  const data = { schemaVersion: 1, settings: { dailyLimitMinutes: 40, parentPinSet: false }, profiles: [], topics: [] };

  const result = upsertVideo(data, {
    topicId: "civil-revolutions",
    topicProfile: "형",
    topicTitle: "시민혁명",
    topicEmoji: "🏛️",
    sectionLabel: "1단계 · 한국어",
    video: video(),
  });

  assert.equal(result.topics.length, 1);
  assert.equal(result.topics[0].id, "civil-revolutions");
  assert.equal(result.topics[0].profile, "형");
  assert.equal(result.topics[0].sections.length, 1);
  assert.equal(result.topics[0].sections[0].videos[0].videoId, "PBn7iWzrKoI");
});

test("upsertVideo requires topicProfile when creating a new topic", () => {
  const data = { schemaVersion: 1, settings: { dailyLimitMinutes: 40, parentPinSet: false }, profiles: [], topics: [] };

  assert.throws(
    () =>
      upsertVideo(data, {
        topicId: "civil-revolutions",
        topicTitle: "시민혁명",
        sectionLabel: "1단계",
        video: video(),
      }),
    TopicsStoreError
  );
});

test("upsertVideo auto-registers a profile name not yet in root.profiles", () => {
  const data = { schemaVersion: 1, settings: { dailyLimitMinutes: 40, parentPinSet: false }, profiles: ["형"], topics: [] };

  const result = upsertVideo(data, {
    topicId: "space",
    topicProfile: "동생",
    topicTitle: "우주",
    sectionLabel: "1단계",
    video: video(),
  });

  assert.deepEqual(result.profiles, ["형", "동생"]);
});

test("upsertVideo does not duplicate a profile name that's already registered", () => {
  const data = { schemaVersion: 1, settings: { dailyLimitMinutes: 40, parentPinSet: false }, profiles: ["형"], topics: [] };

  const result = upsertVideo(data, {
    topicId: "civil-revolutions",
    topicProfile: "형",
    topicTitle: "시민혁명",
    sectionLabel: "1단계",
    video: video(),
  });

  assert.deepEqual(result.profiles, ["형"]);
});

test("upsertVideo appends to an existing section rather than duplicating it", () => {
  const data = {
    schemaVersion: 1,
    settings: { dailyLimitMinutes: 40, parentPinSet: false },
    profiles: ["형"],
    topics: [
      {
        id: "civil-revolutions",
        profile: "형",
        title: "시민혁명",
        sections: [{ label: "1단계", videos: [video({ videoId: "IIDfZ-8o4jE" })] }],
      },
    ],
  };

  const result = upsertVideo(data, {
    topicId: "civil-revolutions",
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
    profiles: ["형"],
    topics: [
      {
        id: "civil-revolutions",
        profile: "형",
        title: "시민혁명",
        sections: [{ label: "1단계", videos: [video({ videoId: "IIDfZ-8o4jE" })] }],
      },
    ],
  };

  const result = upsertVideo(data, {
    topicId: "civil-revolutions",
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
    profiles: ["형"],
    topics: [
      {
        id: "civil-revolutions",
        profile: "형",
        title: "시민혁명",
        sections: [{ label: "1단계", videos: [video({ videoId: "IIDfZ-8o4jE" })] }],
      },
    ],
  };

  assert.throws(
    () =>
      upsertVideo(data, {
        topicId: "space",
        topicProfile: "형",
        topicTitle: "우주",
        sectionLabel: "1단계",
        video: video({ videoId: "IIDfZ-8o4jE" }),
      }),
    TopicsStoreError
  );
});

test("upsertVideo never mutates the input data", () => {
  const data = { schemaVersion: 1, settings: { dailyLimitMinutes: 40, parentPinSet: false }, profiles: [], topics: [] };
  upsertVideo(data, {
    topicId: "civil-revolutions",
    topicProfile: "형",
    topicTitle: "시민혁명",
    sectionLabel: "1단계",
    video: video(),
  });
  assert.deepEqual(data.topics, []);
  assert.deepEqual(data.profiles, []);
});

function dataWithOneVideo(approved) {
  return {
    schemaVersion: 1,
    settings: { dailyLimitMinutes: 40, parentPinSet: false },
    profiles: ["형"],
    topics: [
      {
        id: "civil-revolutions",
        profile: "형",
        title: "시민혁명",
        sections: [{ label: "1단계", videos: [video({ approved })] }],
      },
    ],
  };
}

test("setVideoApproval flips approved to true and reports the found video/topic", () => {
  const data = dataWithOneVideo(false);
  const { updated, found } = setVideoApproval(data, "PBn7iWzrKoI", true);

  assert.equal(updated.topics[0].sections[0].videos[0].approved, true);
  assert.equal(found.topic.id, "civil-revolutions");
  assert.equal(found.video.approved, false); // found reflects pre-flip state
});

test("setVideoApproval flips approved to false (revoke)", () => {
  const data = dataWithOneVideo(true);
  const { updated } = setVideoApproval(data, "PBn7iWzrKoI", false);

  assert.equal(updated.topics[0].sections[0].videos[0].approved, false);
});

test("setVideoApproval returns found: null when the videoId doesn't exist", () => {
  const data = dataWithOneVideo(false);
  const { found } = setVideoApproval(data, "does-not-exist", true);

  assert.equal(found, null);
});

test("setVideoApproval never mutates the input data", () => {
  const data = dataWithOneVideo(false);
  setVideoApproval(data, "PBn7iWzrKoI", true);
  assert.equal(data.topics[0].sections[0].videos[0].approved, false);
});

test("removeVideo deletes the video and drops the emptied section/topic", () => {
  const data = dataWithOneVideo(true);
  const { updated, found } = removeVideo(data, "PBn7iWzrKoI");

  assert.equal(updated.topics.length, 0);
  assert.equal(found.topic.id, "civil-revolutions");
  assert.equal(found.video.videoId, "PBn7iWzrKoI");
});

test("removeVideo keeps a topic/section that still has other videos", () => {
  const data = dataWithOneVideo(true);
  data.topics[0].sections[0].videos.push(video({ videoId: "IIDfZ-8o4jE" }));

  const { updated } = removeVideo(data, "PBn7iWzrKoI");

  assert.equal(updated.topics.length, 1);
  assert.equal(updated.topics[0].sections[0].videos.length, 1);
  assert.equal(updated.topics[0].sections[0].videos[0].videoId, "IIDfZ-8o4jE");
});

test("removeVideo returns found: null when the videoId doesn't exist", () => {
  const data = dataWithOneVideo(true);
  const { found } = removeVideo(data, "does-not-exist");
  assert.equal(found, null);
});

test("removeVideo never mutates the input data", () => {
  const data = dataWithOneVideo(true);
  removeVideo(data, "PBn7iWzrKoI");
  assert.equal(data.topics[0].sections[0].videos.length, 1);
});
