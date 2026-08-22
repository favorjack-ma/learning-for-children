/**
 * Pure data-mutation logic for topics.json, shared by the add-video CLI and its tests.
 * No file I/O here — callers read/write the JSON themselves.
 */

class TopicsStoreError extends Error {
  constructor(message) {
    super(message);
    this.name = "TopicsStoreError";
  }
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Derives a topic id from its title, falling back to a random id for non-Latin titles. */
function generateTopicId(title, explicitId) {
  if (explicitId) return explicitId;
  const slug = slugify(title);
  if (slug) return slug;
  return `topic-${Math.random().toString(16).slice(2, 8)}`;
}

function findDuplicateVideo(topics, videoId) {
  for (const topic of topics) {
    for (const section of topic.sections) {
      if (section.videos.some((v) => v.videoId === videoId)) {
        return topic;
      }
    }
  }
  return null;
}

/**
 * Adds `video` into the topic/section addressed by topicId/sectionLabel, creating
 * either (or both) if they don't exist yet. Returns a new data object; never mutates
 * the input. Throws TopicsStoreError if the videoId already exists anywhere.
 */
function upsertVideo(data, { topicId, topicTitle, topicEmoji, topicSubtitle, sectionLabel, video }) {
  const duplicate = findDuplicateVideo(data.topics, video.videoId);
  if (duplicate) {
    throw new TopicsStoreError(`videoId ${video.videoId} already exists in topic "${duplicate.id}"`);
  }

  const existingTopic = data.topics.find((t) => t.id === topicId);
  const baseTopic =
    existingTopic ?? {
      id: topicId,
      title: topicTitle,
      ...(topicSubtitle ? { subtitle: topicSubtitle } : {}),
      ...(topicEmoji ? { emoji: topicEmoji } : {}),
      sections: [],
    };

  const sectionIndex = baseTopic.sections.findIndex((s) => s.label === sectionLabel);
  const newSections =
    sectionIndex === -1
      ? [...baseTopic.sections, { label: sectionLabel, videos: [video] }]
      : baseTopic.sections.map((s, i) => (i === sectionIndex ? { ...s, videos: [...s.videos, video] } : s));

  const updatedTopic = { ...baseTopic, sections: newSections };

  const newTopics = existingTopic
    ? data.topics.map((t) => (t.id === topicId ? updatedTopic : t))
    : [...data.topics, updatedTopic];

  return { ...data, topics: newTopics };
}

export { TopicsStoreError, slugify, generateTopicId, upsertVideo };
