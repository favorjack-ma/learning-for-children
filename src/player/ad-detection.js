/**
 * YouTube's IFrame API doesn't expose an official "an ad is playing" state.
 * A pre-roll ad reports its own (short, unrelated) duration, so comparing the
 * live duration against the content length we already recorded in
 * topics.json is a reliable enough signal to tell an ad apart from the real
 * video. Pure function so this heuristic can be unit-tested without needing
 * an actual ad to appear.
 */
function isLikelyAd(reportedDurationSec, expectedDurationSec, toleranceSec = 5) {
  if (!(reportedDurationSec > 0)) return false; // not enough info yet — default to "not an ad"
  return Math.abs(reportedDurationSec - expectedDurationSec) > toleranceSec;
}

export { isLikelyAd };
