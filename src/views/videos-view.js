import { el } from "../dom-utils.js";
import { formatTime } from "../player/controls.js";
import { hasEverWatched } from "../watch-log.js";

function render(container, ctx) {
  container.innerHTML = "";
  const view = el("div", "view videos-view");

  const visible = ctx.getVisibleData();
  const topic = visible.topics.find((t) => t.id === ctx.route.topicId);

  if (!topic) {
    view.appendChild(el("div", "empty-state", "이 주제는 지금 볼 수 없어요."));
    container.appendChild(view);
    ctx.setHeader({ title: "목록", showBack: true, onBack: () => ctx.navigate({ view: "topics" }) });
    return;
  }

  for (const section of topic.sections) {
    const block = el("div", "section-block");
    block.appendChild(el("h2", "section-label", section.label));

    const list = el("div", "video-list");
    for (const video of section.videos) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "video-card";

      const thumb = document.createElement("img");
      thumb.className = "thumb";
      thumb.src = `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`;
      thumb.alt = "";
      thumb.loading = "lazy";
      card.appendChild(thumb);

      const info = el("div", "info");
      info.appendChild(el("div", "video-title", video.title));

      const meta = el("div", "meta");
      meta.appendChild(el("span", `lang-badge ${video.lang}`, video.lang === "ko" ? "한국어" : "영어"));
      meta.appendChild(document.createTextNode(`${video.channel} · ${formatTime(video.durationSec)}`));
      info.appendChild(meta);

      card.appendChild(info);

      if (hasEverWatched(ctx.watchLog, video.videoId)) {
        card.appendChild(el("span", "completed-check", "✔"));
      }

      card.addEventListener("click", () =>
        ctx.navigate({ view: "player", topicId: topic.id, videoId: video.videoId })
      );
      list.appendChild(card);
    }

    block.appendChild(list);
    view.appendChild(block);
  }

  container.appendChild(view);
  ctx.setHeader({ title: topic.title, showBack: true, onBack: () => ctx.navigate({ view: "topics" }) });
}

export { render };
