/**
 * Pure watch-log logic. The log shape:
 * { [dateKey]: { seconds: number, videos: { [videoId]: { seconds: number, completed: boolean } } } }
 * No I/O here — persistence (localStorage) is wired up separately.
 */

function createEmptyLog() {
  return {};
}

function getDayEntry(log, dateKey) {
  return log[dateKey] ?? { seconds: 0, videos: {} };
}

function addWatchSeconds(log, dateKey, videoId, deltaSeconds) {
  if (deltaSeconds <= 0) return log;

  const day = getDayEntry(log, dateKey);
  const videoEntry = day.videos[videoId] ?? { seconds: 0, completed: false };

  return {
    ...log,
    [dateKey]: {
      seconds: day.seconds + deltaSeconds,
      videos: {
        ...day.videos,
        [videoId]: {
          ...videoEntry,
          seconds: videoEntry.seconds + deltaSeconds,
        },
      },
    },
  };
}

function markCompleted(log, dateKey, videoId) {
  const day = getDayEntry(log, dateKey);
  const videoEntry = day.videos[videoId] ?? { seconds: 0, completed: false };

  return {
    ...log,
    [dateKey]: {
      ...day,
      videos: {
        ...day.videos,
        [videoId]: {
          ...videoEntry,
          completed: true,
        },
      },
    },
  };
}

function getTodaySeconds(log, dateKey) {
  return getDayEntry(log, dateKey).seconds;
}

function getVideoSeconds(log, dateKey, videoId) {
  return getDayEntry(log, dateKey).videos[videoId]?.seconds ?? 0;
}

function isVideoCompleted(log, dateKey, videoId) {
  return getDayEntry(log, dateKey).videos[videoId]?.completed ?? false;
}

function resetDay(log, dateKey) {
  const { [dateKey]: _removed, ...rest } = log;
  return rest;
}

/** True if the video has a log entry on any past or present day (not limited to today). */
function hasEverWatched(log, videoId) {
  return Object.values(log).some((day) => day.videos[videoId] !== undefined);
}

export {
  createEmptyLog,
  addWatchSeconds,
  markCompleted,
  getTodaySeconds,
  getVideoSeconds,
  isVideoCompleted,
  hasEverWatched,
  resetDay,
};
