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
 * either (or both) if they don't exist yet. `topicProfile` is required only when
 * creating a new topic; if it names a profile not yet in data.profiles, that profile
 * is registered automatically (no separate profile-management step needed). Returns
 * a new data object; never mutates the input. Throws TopicsStoreError if the videoId
 * already exists anywhere, or if a new topic is created without a profile.
 */
function upsertVideo(data, { topicId, topicProfile, topicTitle, topicEmoji, topicSubtitle, sectionLabel, video }) {
  const duplicate = findDuplicateVideo(data.topics, video.videoId);
  if (duplicate) {
    throw new TopicsStoreError(`videoId ${video.videoId} already exists in topic "${duplicate.id}"`);
  }

  const existingTopic = data.topics.find((t) => t.id === topicId);

  if (!existingTopic && !topicProfile) {
    throw new TopicsStoreError("topicProfile is required when creating a new topic");
  }

  const baseTopic =
    existingTopic ?? {
      id: topicId,
      profile: topicProfile,
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

  const newProfiles =
    !existingTopic && !data.profiles.includes(topicProfile) ? [...data.profiles, topicProfile] : data.profiles;

  return { ...data, profiles: newProfiles, topics: newTopics };
}

/**
 * Sets a video's approved flag by videoId, wherever it lives in the data.
 * Returns { updated, found } — `found` is { topic, video } for the video as it
 * was BEFORE the flip, or null if no video with that id exists anywhere.
 * Never mutates the input.
 */
function setVideoApproval(data, videoId, approved) {
  let found = null;
  const topics = data.topics.map((topic) => ({
    ...topic,
    sections: topic.sections.map((section) => ({
      ...section,
      videos: section.videos.map((video) => {
        if (video.videoId !== videoId) return video;
        found = { topic, video };
        return { ...video, approved };
      }),
    })),
  }));
  return { updated: { ...data, topics }, found };
}

/**
 * Permanently removes a video by videoId, wherever it lives in the data.
 * Drops any section or topic left with no videos. Returns { updated, found }
 * — `found` is { topic, video } as it was before removal, or null if no
 * video with that id exists anywhere. Never mutates the input.
 */
function removeVideo(data, videoId) {
  let found = null;
  const topics = data.topics
    .map((topic) => ({
      ...topic,
      sections: topic.sections
        .map((section) => ({
          ...section,
          videos: section.videos.filter((video) => {
            if (video.videoId !== videoId) return true;
            found = { topic, video };
            return false;
          }),
        }))
        .filter((section) => section.videos.length > 0),
    }))
    .filter((topic) => topic.sections.length > 0);
  return { updated: { ...data, topics }, found };
}

export { TopicsStoreError, slugify, generateTopicId, upsertVideo, setVideoApproval, removeVideo };
