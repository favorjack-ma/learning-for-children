import { loadTopics, filterApproved, DataValidationError } from "./data.js";
import {
  withEffectiveApproval,
  approve as approveOverride,
  revoke as revokeOverride,
  isApproved,
} from "./approvals.js";
import {
  withRemovalsApplied,
  remove as removeOverride,
  restore as restoreOverride,
  isRemoved,
} from "./removals.js";
import * as storage from "./storage.js";
import { getTodayDateKey } from "./time-limit.js";
import { resetDay } from "./watch-log.js";
import { el } from "./dom-utils.js";
import * as topicsView from "./views/topics-view.js";
import * as videosView from "./views/videos-view.js";
import * as playerView from "./views/player-view.js";
import { renderMessageScreen } from "./views/player-view.js";
import { renderPinGate, renderParentDashboard } from "./parent-mode.js";

const LOGO_TAPS_REQUIRED = 5;
const LOGO_TAP_WINDOW_MS = 1500;

async function main() {
  const appRoot = document.getElementById("app");

  const backBtn = document.createElement("button");
  backBtn.type = "button";
  backBtn.className = "back-button";
  backBtn.textContent = "←";
  backBtn.style.display = "none";

  const logoBtn = document.createElement("button");
  logoBtn.type = "button";
  logoBtn.className = "logo";
  logoBtn.textContent = "🎬";
  logoBtn.setAttribute("aria-label", "부모 모드 (5번 탭)");

  const titleEl = el("span", "title", "");

  const headerEl = el("header", "app-header");
  headerEl.append(backBtn, logoBtn, titleEl);

  const mainEl = document.createElement("main");
  mainEl.id = "main-view";

  appRoot.innerHTML = "";
  appRoot.append(headerEl, mainEl);

  let data;
  try {
    data = await loadTopics("./data/topics.json");
  } catch (error) {
    renderMessageScreen(mainEl, {
      emoji: "😵",
      title: "영상 목록을 불러오지 못했어요",
      message: error instanceof DataValidationError ? error.message : String(error),
    });
    return;
  }

  let watchLog = storage.loadWatchLog();
  let approvalOverrides = storage.loadApprovalOverrides();
  let removals = storage.loadRemovals();
  let settings = storage.loadSettings();
  let selectedProfile = storage.loadSelectedProfile();
  if (!selectedProfile || !data.profiles.includes(selectedProfile)) {
    selectedProfile = data.profiles[0];
  }
  let route = { view: "topics" };
  let currentDestroy = null;

  let logoTapCount = 0;
  let logoTapTimer = null;
  logoBtn.addEventListener("click", () => {
    logoTapCount += 1;
    clearTimeout(logoTapTimer);
    logoTapTimer = setTimeout(() => {
      logoTapCount = 0;
    }, LOGO_TAP_WINDOW_MS);
    if (logoTapCount >= LOGO_TAPS_REQUIRED) {
      logoTapCount = 0;
      ctx.navigate({ view: "parent-pin" });
    }
  });

  const ctx = {
    get data() {
      return data;
    },
    get route() {
      return route;
    },
    get watchLog() {
      return watchLog;
    },
    get dailyLimitMinutes() {
      return settings.dailyLimitMinutes ?? data.settings.dailyLimitMinutes;
    },
    get selectedProfile() {
      return selectedProfile;
    },
    setSelectedProfile(profileName) {
      selectedProfile = profileName;
      storage.saveSelectedProfile(selectedProfile);
      renderCurrentView();
    },
    getVisibleData() {
      return filterApproved(withEffectiveApproval(withRemovalsApplied(data, removals), approvalOverrides));
    },
    isVideoApproved(video) {
      return isApproved(video, approvalOverrides);
    },
    isVideoRemoved(video) {
      return isRemoved(video, removals);
    },
    getTodayDateKey,
    navigate(nextRoute) {
      setRoute(nextRoute);
    },
    setHeader({ title, showBack, onBack }) {
      titleEl.textContent = title;
      backBtn.style.display = showBack ? "" : "none";
      backBtn.onclick = onBack ?? null;
    },
    updateWatchLog(nextLog) {
      watchLog = nextLog;
      storage.saveWatchLog(watchLog);
    },
    resetTodayLog() {
      watchLog = resetDay(watchLog, getTodayDateKey());
      storage.saveWatchLog(watchLog);
    },
    setDailyLimitMinutes(minutes) {
      settings = { ...settings, dailyLimitMinutes: minutes };
      storage.saveSettings(settings);
    },
    hasPinSet() {
      return Boolean(settings.parentPin);
    },
    setPin(pin) {
      settings = { ...settings, parentPin: pin };
      storage.saveSettings(settings);
    },
    verifyPin(pin) {
      return settings.parentPin === pin;
    },
    approveVideo(videoId) {
      approvalOverrides = approveOverride(approvalOverrides, videoId);
      storage.saveApprovalOverrides(approvalOverrides);
    },
    revokeVideo(videoId) {
      approvalOverrides = revokeOverride(approvalOverrides, videoId);
      storage.saveApprovalOverrides(approvalOverrides);
    },
    removeVideo(videoId) {
      removals = removeOverride(removals, videoId);
      storage.saveRemovals(removals);
    },
    restoreVideo(videoId) {
      removals = restoreOverride(removals, videoId);
      storage.saveRemovals(removals);
    },
    getErrorLog() {
      return storage.loadErrorLog();
    },
    clearErrorLog() {
      storage.clearErrorLog();
    },
    logPlayerError(entry) {
      storage.appendErrorLog(entry);
    },
    showLimitReached() {
      setRoute({ view: "limit-reached" });
    },
    showVideoEnded(topicId) {
      setRoute({ view: "video-ended", topicId });
    },
    showPlaybackError(topicId, message) {
      setRoute({ view: "playback-error", topicId, message });
    },
  };

  // Every screen change pushes a real history entry so the tablet's Android
  // back button/gesture steps back through our screens (player → videos →
  // topics) instead of leaving the app entirely, which has no history entry
  // of its own to fall back to otherwise.
  function setRoute(nextRoute) {
    route = nextRoute;
    history.pushState(route, "");
    renderCurrentView();
  }

  history.replaceState(route, ""); // attach the initial route to the page's own load entry

  window.addEventListener("popstate", (event) => {
    route = event.state ?? { view: "topics" };
    renderCurrentView();
  });

  function renderCurrentView() {
    currentDestroy?.();
    currentDestroy = null;

    switch (route.view) {
      case "topics":
        topicsView.render(mainEl, ctx);
        break;
      case "videos":
        videosView.render(mainEl, ctx);
        break;
      case "player":
        currentDestroy = playerView.render(mainEl, ctx) ?? null;
        break;
      case "limit-reached":
        ctx.setHeader({ title: "오늘은 여기까지", showBack: false });
        renderMessageScreen(mainEl, {
          emoji: "⏰",
          title: "오늘은 여기까지! 내일 또 보자 👋",
          message: "내일 다시 만나요.",
          actionLabel: "목록으로",
          onAction: () => ctx.navigate({ view: "topics" }),
        });
        break;
      case "video-ended":
        ctx.setHeader({ title: "다 봤어요", showBack: false });
        renderMessageScreen(mainEl, {
          emoji: "🎉",
          title: "다 봤어요!",
          message: "다른 영상도 볼까요?",
          actionLabel: "목록으로",
          onAction: () => ctx.navigate({ view: "videos", topicId: route.topicId }),
        });
        break;
      case "playback-error":
        ctx.setHeader({ title: "재생 오류", showBack: false });
        renderMessageScreen(mainEl, {
          emoji: "🙈",
          title: "이 영상은 지금 볼 수 없어요",
          message: route.message ?? "아빠에게 알려주세요.",
          actionLabel: "목록으로",
          onAction: () => ctx.navigate({ view: "videos", topicId: route.topicId }),
        });
        break;
      case "parent-pin":
        renderPinGate(mainEl, ctx);
        break;
      case "parent":
        renderParentDashboard(mainEl, ctx);
        break;
      default:
        topicsView.render(mainEl, ctx);
    }
  }

  renderCurrentView();
}

main();
