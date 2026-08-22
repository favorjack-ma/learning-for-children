#!/usr/bin/env node
/**
 * Re-verifies every video already in topics.json against live YouTube endpoints.
 * Videos that fail (deleted, private, or now blocking embedding) are flipped to
 * approved:false so they immediately stop showing up on the child's screen.
 * Run this periodically (e.g. monthly) since links rot over time.
 *
 * Usage: node tools/verify-videos.mjs [--file <path>] [--fix]
 *   --fix   Write the approved:false demotions back to topics.json (default: dry run, report only)
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { validateTopicsData } from "../src/data.js";
import { verifyVideo } from "./lib/youtube-verify.mjs";

const DEFAULT_TOPICS_FILE = fileURLToPath(new URL("../data/topics.json", import.meta.url));

function parseArgs(argv) {
  const args = { fix: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--fix") args.fix = true;
    else if (argv[i] === "--file") args.file = argv[++i];
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const topicsFile = args.file ?? DEFAULT_TOPICS_FILE;

  const raw = await readFile(topicsFile, "utf8");
  const data = validateTopicsData(JSON.parse(raw));

  const allVideos = data.topics.flatMap((topic) =>
    topic.sections.flatMap((section) => section.videos.map((video) => ({ topic, section, video })))
  );

  console.log(`Verifying ${allVideos.length} video(s)...\n`);

  const failures = [];
  let checkedCount = 0;

  for (const { topic, section, video } of allVideos) {
    const result = await verifyVideo(video.videoId);
    checkedCount++;
    if (result.ok) {
      console.log(`✔ ${video.videoId}  ${video.title}`);
    } else {
      console.log(`✖ ${video.videoId}  ${video.title}  →  ${result.reason}`);
      failures.push({ topic, section, video, reason: result.reason });
    }
  }

  console.log(`\n${checkedCount - failures.length}/${checkedCount} OK, ${failures.length} failed.`);

  if (failures.length === 0) {
    return;
  }

  if (!args.fix) {
    console.log("\nRun again with --fix to demote these to approved:false.");
    process.exitCode = 1;
    return;
  }

  const failedIds = new Set(failures.map((f) => f.video.videoId));
  const updated = {
    ...data,
    topics: data.topics.map((topic) => ({
      ...topic,
      sections: topic.sections.map((section) => ({
        ...section,
        videos: section.videos.map((video) =>
          failedIds.has(video.videoId) ? { ...video, approved: false } : video
        ),
      })),
    })),
  };

  validateTopicsData(updated);
  await writeFile(topicsFile, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
  console.log(`\nDemoted ${failures.length} video(s) to approved:false and saved ${topicsFile}.`);
  process.exitCode = 1;
}

main().catch((error) => {
  console.error("✖ unexpected error:", error);
  process.exitCode = 1;
});
