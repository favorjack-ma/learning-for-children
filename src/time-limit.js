import { getTodaySeconds } from "./watch-log.js";

/**
 * Returns today's date key (YYYY-MM-DD) in the Asia/Seoul timezone,
 * independent of the device's local timezone/clock settings.
 */
function getTodayDateKey(now = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function remainingSeconds(log, dateKey, dailyLimitMinutes) {
  const limitSeconds = dailyLimitMinutes * 60;
  const usedSeconds = getTodaySeconds(log, dateKey);
  return Math.max(0, limitSeconds - usedSeconds);
}

function isLimitReached(log, dateKey, dailyLimitMinutes) {
  return remainingSeconds(log, dateKey, dailyLimitMinutes) <= 0;
}

/** Fraction of today's limit already used, clamped to [0, 1]. Useful for a progress bar. */
function usedFraction(log, dateKey, dailyLimitMinutes) {
  const limitSeconds = dailyLimitMinutes * 60;
  if (limitSeconds <= 0) return 1;
  const usedSeconds = getTodaySeconds(log, dateKey);
  return Math.min(1, usedSeconds / limitSeconds);
}

export { getTodayDateKey, remainingSeconds, isLimitReached, usedFraction };
