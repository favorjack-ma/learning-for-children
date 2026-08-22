/**
 * Parent-mode approval overrides, layered on top of topics.json's static `approved`
 * flag. Overrides live in this device's localStorage, so the natural flow is: dad
 * adds a video via the CLI (approved:false), then opens parent mode ON THE CHILD'S
 * TABLET to preview and approve it there. No backend or cross-device sync needed.
 */

function createEmptyOverrides() {
  return {};
}

function approve(overrides, videoId) {
  return { ...overrides, [videoId]: true };
}

function revoke(overrides, videoId) {
  const { [videoId]: _removed, ...rest } = overrides;
  return rest;
}

function isApproved(video, overrides) {
  return video.approved === true || overrides[video.videoId] === true;
}

/** Returns a copy of `data` with each video's approved flag OR'd with its override. */
function withEffectiveApproval(data, overrides) {
  return {
    ...data,
    topics: data.topics.map((topic) => ({
      ...topic,
      sections: topic.sections.map((section) => ({
        ...section,
        videos: section.videos.map((video) => ({
          ...video,
          approved: isApproved(video, overrides),
        })),
      })),
    })),
  };
}

export { createEmptyOverrides, approve, revoke, isApproved, withEffectiveApproval };
