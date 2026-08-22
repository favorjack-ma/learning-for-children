import test from "node:test";
import assert from "node:assert/strict";
import { validateTopicsData, filterApproved, DataValidationError } from "../src/data.js";

function validVideo(overrides = {}) {
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

function validData(overrides = {}) {
  return {
    schemaVersion: 1,
    settings: { dailyLimitMinutes: 40, parentPinSet: false },
    profiles: ["형", "동생"],
    topics: [
      {
        id: "civil-revolutions",
        profile: "형",
        title: "시민혁명",
        sections: [{ label: "1단계", videos: [validVideo()] }],
      },
    ],
    ...overrides,
  };
}

test("validateTopicsData accepts a well-formed document", () => {
  const data = validData();
  assert.deepEqual(validateTopicsData(data), data);
});

test("validateTopicsData rejects wrong schemaVersion", () => {
  assert.throws(() => validateTopicsData(validData({ schemaVersion: 2 })), DataValidationError);
});

test("validateTopicsData rejects malformed videoId", () => {
  const data = validData();
  data.topics[0].sections[0].videos[0].videoId = "too-short";
  assert.throws(() => validateTopicsData(data), DataValidationError);
});

test("validateTopicsData rejects unknown lang", () => {
  const data = validData();
  data.topics[0].sections[0].videos[0].lang = "fr";
  assert.throws(() => validateTopicsData(data), DataValidationError);
});

test("validateTopicsData rejects duplicate topic ids", () => {
  const data = validData();
  data.topics.push({ ...data.topics[0] });
  assert.throws(() => validateTopicsData(data), /duplicate topic id/);
});

test("validateTopicsData rejects non-positive durationSec", () => {
  const data = validData();
  data.topics[0].sections[0].videos[0].durationSec = 0;
  assert.throws(() => validateTopicsData(data), DataValidationError);
});

test("validateTopicsData rejects missing settings.dailyLimitMinutes", () => {
  const data = validData({ settings: { parentPinSet: false } });
  assert.throws(() => validateTopicsData(data), DataValidationError);
});

test("validateTopicsData rejects a topic whose profile isn't in root.profiles", () => {
  const data = validData();
  data.topics[0].profile = "누군가";
  assert.throws(() => validateTopicsData(data), /not listed in root\.profiles/);
});

test("validateTopicsData rejects a topic with no profile", () => {
  const data = validData();
  delete data.topics[0].profile;
  assert.throws(() => validateTopicsData(data), DataValidationError);
});

test("validateTopicsData rejects duplicate entries in root.profiles", () => {
  const data = validData({ profiles: ["형", "형"] });
  assert.throws(() => validateTopicsData(data), /must not contain duplicates/);
});

test("validateTopicsData accepts a topic for any listed profile, including one with no topics yet", () => {
  const data = validData();
  assert.doesNotThrow(() => validateTopicsData(data));
});

test("filterApproved drops unapproved videos and empties sections/topics accordingly", () => {
  const data = validData();
  data.topics[0].sections[0].videos.push(validVideo({ videoId: "IIDfZ-8o4jE", approved: false }));
  data.topics.push({
    id: "space",
    profile: "동생",
    title: "우주",
    sections: [{ label: "1단계", videos: [validVideo({ videoId: "xZSDBIXDaiU", approved: false })] }],
  });

  const filtered = filterApproved(data);

  assert.equal(filtered.topics.length, 1);
  assert.equal(filtered.topics[0].id, "civil-revolutions");
  assert.equal(filtered.topics[0].sections[0].videos.length, 1);
  assert.equal(filtered.topics[0].sections[0].videos[0].videoId, "PBn7iWzrKoI");
});

test("filterApproved does not mutate the input", () => {
  const data = validData();
  const originalVideoCount = data.topics[0].sections[0].videos.length;
  filterApproved(data);
  assert.equal(data.topics[0].sections[0].videos.length, originalVideoCount);
});
