/**
 * Shared YouTube verification logic used by add-video.mjs and verify-videos.mjs.
 * Talks to public, unauthenticated YouTube endpoints only (oEmbed + the watch page).
 */

const ID_EXTRACT_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtu\.be\/)([A-Za-z0-9_-]{11})/,
];

/** Extracts an 11-char YouTube video id from a URL or a bare id string. */
function extractVideoId(input) {
  const trimmed = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  for (const pattern of ID_EXTRACT_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Fetches metadata + embeddability for a video id from public YouTube endpoints.
 * Returns { ok: true, title, channel, durationSec } or { ok: false, reason }.
 */
async function verifyVideo(videoId) {
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
    `https://www.youtube.com/watch?v=${videoId}`
  )}&format=json`;

  let oembedRes;
  try {
    oembedRes = await fetch(oembedUrl);
  } catch (error) {
    return { ok: false, reason: `network error calling oEmbed: ${error.message}` };
  }

  if (!oembedRes.ok) {
    return { ok: false, reason: `video not found or private (oEmbed HTTP ${oembedRes.status})` };
  }

  const oembed = await oembedRes.json();

  let watchRes;
  try {
    watchRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    });
  } catch (error) {
    return { ok: false, reason: `network error fetching watch page: ${error.message}` };
  }

  if (!watchRes.ok) {
    return { ok: false, reason: `watch page unreachable (HTTP ${watchRes.status})` };
  }

  const html = await watchRes.text();

  const embedMatch = html.match(/"playableInEmbed":(true|false)/);
  const playableInEmbed = embedMatch ? embedMatch[1] === "true" : null;

  if (playableInEmbed === false) {
    return { ok: false, reason: "video blocks embedding (playableInEmbed=false)" };
  }
  if (playableInEmbed === null) {
    return { ok: false, reason: "could not determine embeddability from watch page" };
  }

  const durationMatch = html.match(/"lengthSeconds":"(\d+)"/);
  const durationSec = durationMatch ? Number(durationMatch[1]) : null;

  return {
    ok: true,
    title: oembed.title,
    channel: oembed.author_name,
    durationSec,
  };
}

export { extractVideoId, verifyVideo };
