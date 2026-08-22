import { el } from "../dom-utils.js";

function renderProfileSwitcher(ctx) {
  const switcher = el("div", "profile-switcher");
  for (const profile of ctx.data.profiles) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "profile-btn";
    btn.textContent = profile;
    btn.setAttribute("aria-pressed", String(profile === ctx.selectedProfile));
    btn.addEventListener("click", () => ctx.setSelectedProfile(profile));
    switcher.appendChild(btn);
  }
  return switcher;
}

function render(container, ctx) {
  container.innerHTML = "";
  const view = el("div", "view topics-view");

  if (ctx.data.profiles.length > 1) {
    view.appendChild(renderProfileSwitcher(ctx));
  }

  const visible = ctx.getVisibleData();
  const topicsForProfile = visible.topics.filter((topic) => topic.profile === ctx.selectedProfile);

  if (topicsForProfile.length === 0) {
    view.appendChild(el("div", "empty-state", "아직 볼 수 있는 영상이 없어요. 아빠에게 물어보세요!"));
  } else {
    const grid = el("div", "topic-grid");
    for (const topic of topicsForProfile) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "topic-card";
      card.appendChild(el("span", "emoji", topic.emoji ?? "📺"));
      card.appendChild(el("span", "title", topic.title));
      if (topic.subtitle) {
        card.appendChild(el("span", "subtitle", topic.subtitle));
      }
      card.addEventListener("click", () => ctx.navigate({ view: "videos", topicId: topic.id }));
      grid.appendChild(card);
    }
    view.appendChild(grid);
  }

  container.appendChild(view);
  ctx.setHeader({ title: "무엇을 볼까요?", showBack: false });
}

export { render };
