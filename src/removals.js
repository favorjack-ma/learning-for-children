/**
 * Parent-mode "제거" (remove from view) overrides, layered on top of
 * topics.json the same way approvals.js layers approval overrides. Removed
 * videos disappear from the child's screen on this device; nothing is
 * deleted from the underlying data (that requires tools/remove-video.mjs).
 */

function createEmptyRemovals() {
  return {};
}

function remove(removals, videoId) {
  return { ...removals, [videoId]: true };
}

function restore(removals, videoId) {
  const { [videoId]: _removed, ...rest } = removals;
  return rest;
}

function isRemoved(video, removals) {
  return removals[video.videoId] === true;
}

/** Returns a copy of `data` with removed videos filtered out, dropping any section/topic left empty. */
function withRemovalsApplied(data, removals) {
  return {
    ...data,
    topics: data.topics
      .map((topic) => ({
        ...topic,
        sections: topic.sections
          .map((section) => ({
            ...section,
            videos: section.videos.filter((video) => !isRemoved(video, removals)),
          }))
          .filter((section) => section.videos.length > 0),
      }))
      .filter((topic) => topic.sections.length > 0),
  };
}

export { createEmptyRemovals, remove, restore, isRemoved, withRemovalsApplied };
