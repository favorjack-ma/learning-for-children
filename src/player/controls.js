/** Pure formatting helper, unit-tested. */
function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Builds the custom control bar DOM and returns update functions + the root element.
 * All rendering here is imperative DOM (not virtual-dom) to keep this dependency-free.
 */
function createControlsBar({
  onTogglePlay,
  onSeekRelative,
  onSeekTo,
  onToggleRate,
  onToggleCaptions,
  onToggleFullscreen,
  onSkipAd,
  onExit,
}) {
  const root = document.createElement("div");
  root.className = "player-controls";

  const progressRow = document.createElement("div");
  progressRow.className = "progress-row";

  const currentTimeLabel = document.createElement("span");
  currentTimeLabel.className = "time-label";
  currentTimeLabel.textContent = "0:00";

  const progressBar = document.createElement("div");
  progressBar.className = "progress-bar";
  const progressFill = document.createElement("div");
  progressFill.className = "fill";
  progressBar.appendChild(progressFill);
  progressBar.addEventListener("click", (event) => {
    const rect = progressBar.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    onSeekTo(fraction);
  });

  const durationLabel = document.createElement("span");
  durationLabel.className = "time-label";
  durationLabel.textContent = "0:00";

  progressRow.append(currentTimeLabel, progressBar, durationLabel);

  const controlsRow = document.createElement("div");
  controlsRow.className = "controls-row";

  const exitBtn = document.createElement("button");
  exitBtn.className = "control-btn exit";
  exitBtn.type = "button";
  exitBtn.textContent = "← 목록으로";
  exitBtn.addEventListener("click", onExit);

  const backBtn = document.createElement("button");
  backBtn.className = "control-btn";
  backBtn.type = "button";
  backBtn.textContent = "⏪";
  backBtn.setAttribute("aria-label", "10초 뒤로");
  backBtn.addEventListener("click", () => onSeekRelative(-10));

  const playBtn = document.createElement("button");
  playBtn.className = "control-btn primary";
  playBtn.type = "button";
  playBtn.textContent = "▶";
  playBtn.addEventListener("click", onTogglePlay);

  const forwardBtn = document.createElement("button");
  forwardBtn.className = "control-btn";
  forwardBtn.type = "button";
  forwardBtn.textContent = "⏩";
  forwardBtn.setAttribute("aria-label", "10초 앞으로");
  forwardBtn.addEventListener("click", () => onSeekRelative(10));

  controlsRow.append(exitBtn, backBtn, playBtn, forwardBtn);

  const secondaryRow = document.createElement("div");
  secondaryRow.className = "secondary-controls";

  const rateBtn = document.createElement("button");
  rateBtn.className = "chip-btn";
  rateBtn.type = "button";
  rateBtn.textContent = "배속 1.0x";
  rateBtn.addEventListener("click", onToggleRate);

  const captionsBtn = document.createElement("button");
  captionsBtn.className = "chip-btn";
  captionsBtn.type = "button";
  captionsBtn.textContent = "자막";
  captionsBtn.setAttribute("aria-pressed", "false");
  captionsBtn.addEventListener("click", onToggleCaptions);

  const fullscreenBtn = document.createElement("button");
  fullscreenBtn.className = "chip-btn";
  fullscreenBtn.type = "button";
  fullscreenBtn.textContent = "⛶ 전체화면";
  fullscreenBtn.addEventListener("click", onToggleFullscreen);

  const skipAdBtn = document.createElement("button");
  skipAdBtn.className = "chip-btn";
  skipAdBtn.type = "button";
  skipAdBtn.textContent = "⏭ 광고 건너뛰기";
  skipAdBtn.addEventListener("click", onSkipAd);

  secondaryRow.append(rateBtn, captionsBtn, fullscreenBtn, skipAdBtn);

  root.append(progressRow, controlsRow, secondaryRow);

  return {
    root,
    setPlaying(isPlaying) {
      playBtn.textContent = isPlaying ? "⏸" : "▶";
    },
    setProgress(currentSeconds, durationSeconds) {
      currentTimeLabel.textContent = formatTime(currentSeconds);
      durationLabel.textContent = formatTime(durationSeconds);
      const fraction = durationSeconds > 0 ? Math.min(1, currentSeconds / durationSeconds) : 0;
      progressFill.style.width = `${fraction * 100}%`;
    },
    setRateLabel(rate) {
      rateBtn.textContent = `배속 ${rate.toFixed(2).replace(/0$/, "").replace(/\.$/, ".0")}x`;
    },
    setCaptionsOn(isOn) {
      captionsBtn.setAttribute("aria-pressed", String(isOn));
    },
  };
}

export { formatTime, createControlsBar };
