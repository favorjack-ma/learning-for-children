/**
 * Tiny DOM builder helper. Always sets text via `textContent`, never `innerHTML`,
 * because video titles/channel names come from YouTube (untrusted external data)
 * and must never be interpreted as HTML.
 */
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export { el };
