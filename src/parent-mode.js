import { el } from "./dom-utils.js";
import { formatTime } from "./player/controls.js";

function renderPinGate(container, ctx) {
  container.innerHTML = "";
  const view = el("div", "view parent-pin-view");
  const isFirstTime = !ctx.hasPinSet();

  view.appendChild(el("h2", null, isFirstTime ? "부모 모드 PIN 설정" : "부모 모드"));
  view.appendChild(el("p", null, isFirstTime ? "4자리 숫자를 새로 만들어 주세요." : "4자리 PIN을 입력하세요."));

  const input = document.createElement("input");
  input.type = "password";
  input.inputMode = "numeric";
  input.maxLength = 4;
  input.pattern = "[0-9]*";
  input.className = "pin-input";
  view.appendChild(input);

  const errorMsg = el("p", "pin-error", "");
  view.appendChild(errorMsg);

  function submit() {
    const value = input.value.trim();
    if (!/^\d{4}$/.test(value)) {
      errorMsg.textContent = "숫자 4자리를 입력해주세요.";
      return;
    }
    if (isFirstTime) {
      ctx.setPin(value);
      ctx.navigate({ view: "parent" });
      return;
    }
    if (ctx.verifyPin(value)) {
      ctx.navigate({ view: "parent" });
    } else {
      errorMsg.textContent = "PIN이 맞지 않아요.";
      input.value = "";
    }
  }

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") submit();
  });

  const submitBtn = document.createElement("button");
  submitBtn.type = "button";
  submitBtn.className = "primary-action";
  submitBtn.textContent = isFirstTime ? "설정" : "확인";
  submitBtn.addEventListener("click", submit);
  view.appendChild(submitBtn);

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "control-btn exit";
  cancelBtn.textContent = "취소";
  cancelBtn.addEventListener("click", () => ctx.navigate({ view: "topics" }));
  view.appendChild(cancelBtn);

  container.appendChild(view);
  ctx.setHeader({ title: "부모 모드", showBack: false });
  input.focus();
}

function renderParentDashboard(container, ctx) {
  container.innerHTML = "";
  const view = el("div", "view parent-view");

  view.appendChild(buildLimitSection(container, ctx));
  view.appendChild(buildTodaySection(container, ctx));
  view.appendChild(buildPendingSection(container, ctx));
  view.appendChild(buildErrorLogSection(container, ctx));

  const exitBtn = document.createElement("button");
  exitBtn.type = "button";
  exitBtn.className = "primary-action";
  exitBtn.textContent = "나가기";
  exitBtn.addEventListener("click", () => ctx.navigate({ view: "topics" }));
  view.appendChild(exitBtn);

  container.appendChild(view);
  ctx.setHeader({ title: "부모 모드", showBack: false });
}

function buildLimitSection(container, ctx) {
  const section = el("section", "parent-section");
  section.appendChild(el("h3", null, "하루 시청 시간 한도"));

  const row = el("div", "parent-row");
  const input = document.createElement("input");
  input.type = "number";
  input.min = "1";
  input.max = "180";
  input.step = "5";
  input.value = String(ctx.dailyLimitMinutes);
  row.appendChild(input);
  row.appendChild(el("span", null, "분"));

  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.className = "chip-btn";
  saveBtn.textContent = "저장";
  saveBtn.addEventListener("click", () => {
    const minutes = Number(input.value);
    if (minutes >= 1) {
      ctx.setDailyLimitMinutes(minutes);
      renderParentDashboard(container, ctx);
    }
  });
  row.appendChild(saveBtn);

  section.appendChild(row);
  return section;
}

function buildTodaySection(container, ctx) {
  const section = el("section", "parent-section");
  section.appendChild(el("h3", null, "오늘 시청 기록"));

  const todayKey = ctx.getTodayDateKey();
  const usedSeconds = ctx.watchLog[todayKey]?.seconds ?? 0;
  section.appendChild(el("p", null, `오늘 ${Math.round(usedSeconds / 60)}분 시청함`));

  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.className = "chip-btn";
  resetBtn.textContent = "오늘 기록 초기화";
  resetBtn.addEventListener("click", () => {
    ctx.resetTodayLog();
    renderParentDashboard(container, ctx);
  });
  section.appendChild(resetBtn);

  return section;
}

function buildPendingSection(container, ctx) {
  const section = el("section", "parent-section");
  section.appendChild(el("h3", null, "승인 대기 중인 영상"));

  // Group pending videos by topic, then by section label, so they read as
  // distinct blocks instead of one long undifferentiated list.
  const topicGroups = [];
  for (const topic of ctx.data.topics) {
    const sectionGroups = [];
    for (const videoSection of topic.sections) {
      const pendingVideos = videoSection.videos.filter((video) => !ctx.isVideoApproved(video));
      if (pendingVideos.length > 0) {
        sectionGroups.push({ label: videoSection.label, videos: pendingVideos });
      }
    }
    if (sectionGroups.length > 0) {
      topicGroups.push({ topic, sectionGroups });
    }
  }

  if (topicGroups.length === 0) {
    section.appendChild(el("p", null, "대기 중인 영상이 없어요."));
    return section;
  }

  for (const { topic, sectionGroups } of topicGroups) {
    const topicGroup = el("div", "parent-topic-group");
    topicGroup.appendChild(el("h4", "parent-topic-header", `${topic.emoji ?? "📺"} ${topic.title}`));

    for (const { label, videos } of sectionGroups) {
      const sectionGroup = el("div", "parent-section-group");
      sectionGroup.appendChild(el("div", "parent-section-group-label", label));

      for (const video of videos) {
        const row = el("div", "parent-video-row");

        const info = el("div", "info");
        info.appendChild(el("div", "video-title", video.title));
        info.appendChild(el("div", "meta", `${video.channel} · ${formatTime(video.durationSec)}`));
        row.appendChild(info);

        const previewLink = document.createElement("a");
        previewLink.href = `https://www.youtube.com/watch?v=${video.videoId}`;
        previewLink.target = "_blank";
        previewLink.rel = "noopener noreferrer";
        previewLink.className = "chip-btn";
        previewLink.textContent = "미리보기";
        row.appendChild(previewLink);

        const approveBtn = document.createElement("button");
        approveBtn.type = "button";
        approveBtn.className = "chip-btn";
        approveBtn.textContent = "승인";
        approveBtn.addEventListener("click", () => {
          ctx.approveVideo(video.videoId);
          renderParentDashboard(container, ctx);
        });
        row.appendChild(approveBtn);

        sectionGroup.appendChild(row);
      }

      topicGroup.appendChild(sectionGroup);
    }

    section.appendChild(topicGroup);
  }

  return section;
}

function buildErrorLogSection(container, ctx) {
  const section = el("section", "parent-section");
  section.appendChild(el("h3", null, "재생 오류 기록"));

  const errors = ctx.getErrorLog();
  if (errors.length === 0) {
    section.appendChild(el("p", null, "오류 없음"));
    return section;
  }

  for (const entry of errors.slice(-10).reverse()) {
    section.appendChild(el("p", "meta", `${entry.at} · ${entry.videoId} · ${entry.message}`));
  }

  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.className = "chip-btn";
  clearBtn.textContent = "기록 지우기";
  clearBtn.addEventListener("click", () => {
    ctx.clearErrorLog();
    renderParentDashboard(container, ctx);
  });
  section.appendChild(clearBtn);

  return section;
}

export { renderPinGate, renderParentDashboard };
