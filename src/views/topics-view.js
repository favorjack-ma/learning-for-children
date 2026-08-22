import { el } from "../dom-utils.js";

function render(container, ctx) {
  container.innerHTML = "";
  const view = el("div", "view topics-view");

  const visible = ctx.getVisibleData();

  if (visible.topics.length === 0) {
    view.appendChild(el("div", "empty-state", "아직 볼 수 있는 영상이 없어요. 아빠에게 물어보세요!"));
  } else {
    const grid = el("div", "topic-grid");
    for (const topic of visible.topics) {
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
