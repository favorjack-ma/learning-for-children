/**
 * Thin localStorage adapter. Browser-only I/O — the actual logic that operates
 * on these values (watch-log.js, time-limit.js, approvals.js) is pure and tested
 * separately in Node.
 */

const KEYS = {
  watchLog: "lfc.watchlog.v1",
  approvals: "lfc.approvals.v1",
  settings: "lfc.settings.v1",
  errorLog: "lfc.errors.v1",
};

const MAX_ERROR_LOG_ENTRIES = 50;

function safeParse(json, fallback) {
  if (!json) return fallback;
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

function loadWatchLog() {
  return safeParse(localStorage.getItem(KEYS.watchLog), {});
}

function saveWatchLog(log) {
  localStorage.setItem(KEYS.watchLog, JSON.stringify(log));
}

function loadApprovalOverrides() {
  return safeParse(localStorage.getItem(KEYS.approvals), {});
}

function saveApprovalOverrides(overrides) {
  localStorage.setItem(KEYS.approvals, JSON.stringify(overrides));
}

/** { dailyLimitMinutes: number|null, parentPin: string|null } — null means "not set, use topics.json default". */
function loadSettings() {
  return safeParse(localStorage.getItem(KEYS.settings), { dailyLimitMinutes: null, parentPin: null });
}

function saveSettings(settings) {
  localStorage.setItem(KEYS.settings, JSON.stringify(settings));
}

function loadErrorLog() {
  return safeParse(localStorage.getItem(KEYS.errorLog), []);
}

function appendErrorLog(entry) {
  const log = loadErrorLog();
  const updated = [...log, entry].slice(-MAX_ERROR_LOG_ENTRIES);
  localStorage.setItem(KEYS.errorLog, JSON.stringify(updated));
  return updated;
}

function clearErrorLog() {
  localStorage.setItem(KEYS.errorLog, JSON.stringify([]));
}

export {
  loadWatchLog,
  saveWatchLog,
  loadApprovalOverrides,
  saveApprovalOverrides,
  loadSettings,
  saveSettings,
  loadErrorLog,
  appendErrorLog,
  clearErrorLog,
};
