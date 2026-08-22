import { el } from "../dom-utils.js";
import { createPlayer, PLAYER_STATE } from "../player/yt-player.js";
import { createControlsBar } from "../player/controls.js";
import { addWatchSeconds, markCompleted } from "../watch-log.js";
import { getTodayDateKey, isLimitReached } from "../time-limit.js";

const TICK_MS = 1000;
const RATE_STEPS = [0.75, 1];

function renderMessageScreen(container, { emoji, title, message, actionLabel, onAction }) {
  container.innerHTML = "";
  const screen = el("div", "message-screen");
  screen.appendChild(el("div", "big-emoji", emoji));
  screen.appendChild(el("h2", null, title));
  if (message) screen.appendChild(el("p", null, message));
  if (actionLabel) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "primary-action";
    btn.textContent = actionLabel;
    btn.addEventListener("click", onAction);
    screen.appendChild(btn);
  }
  container.appendChild(screen);
}

function render(container, ctx) {
  const visible = ctx.getVisibleData();
  const topic = visible.topics.find((t) => t.id === ctx.route.topicId);
  const video = topic?.sections.flatMap((s) => s.videos).find((v) => v.videoId === ctx.route.videoId);

  ctx.setHeader({ title: video?.title ?? "재생 중", showBack: false });

  if (!video) {
    renderMessageScreen(container, {
      emoji: "🙈",
      title: "이 영상은 지금 볼 수 없어요",
      message: "아빠에게 알려주세요.",
      actionLabel: "목록으로",
      onAction: () => ctx.navigate({ view: "videos", topicId: ctx.route.topicId }),
    });
    return () => {};
  }

  const dateKey = getTodayDateKey();
  if (isLimitReached(ctx.watchLog, dateKey, ctx.dailyLimitMinutes)) {
    ctx.showLimitReached();
    return () => {};
  }

  container.innerHTML = "";
  const view = el("div", "view player-view");

  const frameWrap = el("div", "player-frame-wrap");
  const playerMount = document.createElement("div");
  frameWrap.appendChild(playerMount);
  const overlay = el("div", "player-overlay");
  frameWrap.appendChild(overlay);
  view.appendChild(frameWrap);

  let rateIndex = RATE_STEPS.indexOf(1);
  let captionsOn = video.lang === "en";
  let tickHandle = null;
  let ytPlayer = null;
  let destroyed = false;
  let lastTickAt = null;

  const controls = createControlsBar({
    onTogglePlay: () => {
      if (!ytPlayer) return;
      const state = ytPlayer.getPlayerState();
      if (state === PLAYER_STATE.PLAYING) ytPlayer.pauseVideo();
      else ytPlayer.playVideo();
    },
    onSeekRelative: (delta) => {
      if (!ytPlayer) return;
      const target = Math.max(0, ytPlayer.getCurrentTime() + delta);
      ytPlayer.seekTo(target, true);
    },
    onSeekTo: (fraction) => {
      if (!ytPlayer) return;
      const duration = ytPlayer.getDuration();
      if (duration > 0) ytPlayer.seekTo(duration * fraction, true);
    },
    onToggleRate: () => {
      if (!ytPlayer) return;
      rateIndex = (rateIndex + 1) % RATE_STEPS.length;
      const rate = RATE_STEPS[rateIndex];
      ytPlayer.setPlaybackRate(rate);
      controls.setRateLabel(rate);
    },
    onToggleCaptions: () => {
      if (!ytPlayer) return;
      captionsOn = !captionsOn;
      controls.setCaptionsOn(captionsOn);
      try {
        if (captionsOn) {
          ytPlayer.loadModule("captions");
        } else {
          ytPlayer.unloadModule("captions");
        }
      } catch {
        // Some videos have no caption track; the toggle is best-effort.
      }
    },
    onToggleFullscreen: () => {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        frameWrap.requestFullscreen?.();
      }
    },
    onExit: () => exitToList(),
  });
  view.appendChild(controls.root);
  controls.setCaptionsOn(captionsOn);

  container.appendChild(view);

  function persistTick() {
    if (lastTickAt === null) return;
    const elapsedSec = Math.round((Date.now() - lastTickAt) / 1000);
    lastTickAt = Date.now();
    if (elapsedSec <= 0) return;

    const key = getTodayDateKey();
    const updatedLog = addWatchSeconds(ctx.watchLog, key, video.videoId, elapsedSec);
    ctx.updateWatchLog(updatedLog);

    if (isLimitReached(updatedLog, key, ctx.dailyLimitMinutes)) {
      ytPlayer?.pauseVideo();
      exitToList({ limitReached: true });
    }
  }

  function startTicking() {
    if (tickHandle) return;
    lastTickAt = Date.now();
    tickHandle = setInterval(persistTick, TICK_MS);
  }

  function stopTicking() {
    if (tickHandle) {
      clearInterval(tickHandle);
      tickHandle = null;
    }
    persistTick();
    lastTickAt = null;
  }

  function progressLoop() {
    if (destroyed || !ytPlayer) return;
    const current = ytPlayer.getCurrentTime?.() ?? 0;
    const duration = ytPlayer.getDuration?.() ?? 0;
    controls.setProgress(current, duration);
    requestAnimationFrame(progressLoop);
  }

  function exitToList({ limitReached = false } = {}) {
    if (destroyed) return;
    destroyed = true;
    stopTicking();
    ytPlayer?.destroy?.();
    if (limitReached) {
      ctx.showLimitReached();
    } else {
      ctx.navigate({ view: "videos", topicId: topic.id });
    }
  }

  createPlayer(playerMount, {
    videoId: video.videoId,
    lang: video.lang,
    onReady: (player) => {
      if (destroyed) return;
      ytPlayer = player;
      player.setPlaybackRate(RATE_STEPS[rateIndex]);
      player.playVideo();
      requestAnimationFrame(progressLoop);
    },
    onStateChange: (state) => {
      if (destroyed) return;
      if (state === PLAYER_STATE.PLAYING) {
        controls.setPlaying(true);
        startTicking();
      } else if (state === PLAYER_STATE.PAUSED || state === PLAYER_STATE.BUFFERING) {
        controls.setPlaying(false);
        stopTicking();
      } else if (state === PLAYER_STATE.ENDED) {
        controls.setPlaying(false);
        stopTicking();
        const key = getTodayDateKey();
        ctx.updateWatchLog(markCompleted(ctx.watchLog, key, video.videoId));
        destroyed = true;
        ytPlayer?.destroy?.();
        ctx.showVideoEnded(topic.id);
      }
    },
    onError: (code, message) => {
      if (destroyed) return;
      ctx.logPlayerError({ videoId: video.videoId, code, message, at: new Date().toISOString() });
      destroyed = true;
      stopTicking();
      ctx.showPlaybackError(topic.id, message);
    },
  });

  return () => {
    if (destroyed) return;
    destroyed = true;
    stopTicking();
    ytPlayer?.destroy?.();
  };
}

export { render, renderMessageScreen };
