const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const ALLOWED_LANGS = new Set(["ko", "en"]);

class DataValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "DataValidationError";
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new DataValidationError(message);
  }
}

function validateVideo(video, path) {
  assert(video && typeof video === "object", `${path}: video must be an object`);
  assert(
    typeof video.videoId === "string" && YOUTUBE_ID_PATTERN.test(video.videoId),
    `${path}: videoId must be an 11-character YouTube id`
  );
  assert(typeof video.title === "string" && video.title.length > 0, `${path}: title is required`);
  assert(typeof video.channel === "string" && video.channel.length > 0, `${path}: channel is required`);
  assert(ALLOWED_LANGS.has(video.lang), `${path}: lang must be one of ${[...ALLOWED_LANGS].join(", ")}`);
  assert(
    typeof video.durationSec === "number" && video.durationSec > 0,
    `${path}: durationSec must be a positive number`
  );
  assert(typeof video.approved === "boolean", `${path}: approved must be a boolean`);
  assert(typeof video.verifiedAt === "string" && video.verifiedAt.length > 0, `${path}: verifiedAt is required`);
}

function validateSection(section, path) {
  assert(section && typeof section === "object", `${path}: section must be an object`);
  assert(typeof section.label === "string" && section.label.length > 0, `${path}: label is required`);
  assert(Array.isArray(section.videos), `${path}: videos must be an array`);
  section.videos.forEach((video, index) => validateVideo(video, `${path}.videos[${index}]`));
}

function validateTopic(topic, path, seenIds, profiles) {
  assert(topic && typeof topic === "object", `${path}: topic must be an object`);
  assert(typeof topic.id === "string" && topic.id.length > 0, `${path}: id is required`);
  assert(!seenIds.has(topic.id), `${path}: duplicate topic id "${topic.id}"`);
  seenIds.add(topic.id);
  assert(typeof topic.profile === "string" && topic.profile.length > 0, `${path}: profile is required`);
  assert(
    profiles.has(topic.profile),
    `${path}: profile "${topic.profile}" is not listed in root.profiles`
  );
  assert(typeof topic.title === "string" && topic.title.length > 0, `${path}: title is required`);
  assert(Array.isArray(topic.sections), `${path}: sections must be an array`);
  topic.sections.forEach((section, index) => validateSection(section, `${path}.sections[${index}]`));
}

/**
 * Validates a parsed topics.json payload. Throws DataValidationError on the
 * first violation found. Pure function — no I/O.
 */
function validateTopicsData(data) {
  assert(data && typeof data === "object", "root: data must be an object");
  assert(data.schemaVersion === 1, "root: schemaVersion must be 1");
  assert(data.settings && typeof data.settings === "object", "root.settings: settings is required");
  assert(
    typeof data.settings.dailyLimitMinutes === "number" && data.settings.dailyLimitMinutes > 0,
    "root.settings.dailyLimitMinutes must be a positive number"
  );
  assert(
    typeof data.settings.parentPinSet === "boolean",
    "root.settings.parentPinSet must be a boolean"
  );
  assert(Array.isArray(data.profiles), "root.profiles must be an array");
  assert(
    data.profiles.every((name) => typeof name === "string" && name.length > 0),
    "root.profiles must contain only non-empty strings"
  );
  assert(
    new Set(data.profiles).size === data.profiles.length,
    "root.profiles must not contain duplicates"
  );
  assert(Array.isArray(data.topics), "root.topics must be an array");

  const profiles = new Set(data.profiles);
  const seenIds = new Set();
  data.topics.forEach((topic, index) => validateTopic(topic, `root.topics[${index}]`, seenIds, profiles));

  return data;
}

/** Returns only videos with approved === true, dropping any section or topic left empty. */
function filterApproved(data) {
  return {
    ...data,
    topics: data.topics
      .map((topic) => ({
        ...topic,
        sections: topic.sections
          .map((section) => ({
            ...section,
            videos: section.videos.filter((video) => video.approved),
          }))
          .filter((section) => section.videos.length > 0),
      }))
      .filter((topic) => topic.sections.length > 0),
  };
}

async function loadTopics(url = "./data/topics.json") {
  const response = await fetch(url);
  if (!response.ok) {
    throw new DataValidationError(`failed to load ${url}: HTTP ${response.status}`);
  }
  const data = await response.json();
  return validateTopicsData(data);
}

export { DataValidationError, validateTopicsData, filterApproved, loadTopics };
