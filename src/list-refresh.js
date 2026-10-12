/**
 * Builds a refresh function that re-fetches the video list and hands it to
 * `apply` — but only while the app is on screen and showing a list (never
 * mid-video, never while a PIN is half-typed). Safe to call from a timer and
 * from visibility events at the same time: overlapping calls share one load.
 */
function createListRefresher({ load, isVisible, canRefresh, apply }) {
  let inFlight = null;

  async function run() {
    let fresh;
    try {
      fresh = await load();
    } catch {
      return; // offline or a bad response: keep showing the list we already have
    }
    // The child may have opened a video while the list was loading.
    if (!isVisible() || !canRefresh()) return;
    apply(fresh);
  }

  return function refresh() {
    if (!isVisible() || !canRefresh()) return Promise.resolve();
    if (!inFlight) {
      inFlight = run().finally(() => {
        inFlight = null;
      });
    }
    return inFlight;
  };
}

export { createListRefresher };
