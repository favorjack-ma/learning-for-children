/**
 * Thin wrapper around the YouTube IFrame Player API. Loads the API script once,
 * creates a fully locked-down player (no native controls, no related videos,
 * no keyboard shortcuts), and exposes a small typed surface to the rest of the app.
 */

const PLAYER_STATE = { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 };

const ERROR_MESSAGES = {
  2: "잘못된 영상 정보예요.",
  5: "이 기기에서 재생할 수 없어요.",
  100: "영상을 찾을 수 없어요.",
  101: "이 영상은 여기서 볼 수 없어요.",
  150: "이 영상은 여기서 볼 수 없어요.",
};

let apiReadyPromise = null;

function loadIframeApi() {
  if (apiReadyPromise) return apiReadyPromise;

  apiReadyPromise = new Promise((resolve) => {
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  });

  return apiReadyPromise;
}

/**
 * @param {HTMLElement} containerEl element to replace with the iframe
 * @param {{videoId: string, lang: 'ko'|'en', onReady, onStateChange, onError}} options
 */
async function createPlayer(containerEl, { videoId, lang, onReady, onStateChange, onError }) {
  const YT = await loadIframeApi();

  return new YT.Player(containerEl, {
    videoId,
    host: "https://www.youtube-nocookie.com",
    playerVars: {
      controls: 0,
      disablekb: 1,
      rel: 0,
      fs: 0,
      iv_load_policy: 3,
      modestbranding: 1,
      playsinline: 1,
      cc_load_policy: lang === "en" ? 1 : 0,
      origin: window.location.origin,
    },
    events: {
      onReady: (event) => onReady?.(event.target),
      onStateChange: (event) => onStateChange?.(event.data, event.target),
      onError: (event) => onError?.(event.data, ERROR_MESSAGES[event.data] ?? "재생 중 문제가 생겼어요."),
    },
  });
}

export { createPlayer, PLAYER_STATE, ERROR_MESSAGES };
