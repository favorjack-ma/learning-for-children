#!/usr/bin/env node
/**
 * Verifies one YouTube URL against public YouTube endpoints and appends it to
 * data/topics.json — always with approved:false so a parent must review it
 * before it shows up on the child's screen.
 *
 * Usage:
 *   node tools/add-video.mjs --new-topic "우주 탐사" --emoji 🚀 --section "1단계 · 한국어" --lang ko <url>
 *   node tools/add-video.mjs --topic civil-revolutions --section "2단계 · 영어" --lang en <url>
 *
 * Flags:
 *   --topic <id>        Add into an existing topic (must already exist)
 *   --new-topic <title> Create a new topic with this title
 *   --id <slug>         Explicit topic id (only used with --new-topic)
 *   --emoji <emoji>     Topic emoji (only used with --new-topic)
 *   --subtitle <text>   Topic subtitle (only used with --new-topic)
 *   --section <label>   Section label to place the video in (created if missing) [required]
 *   --lang <ko|en>      Video language, drives subtitle default [required]
 *   --approve           Mark approved:true immediately (default: false, needs parent review)
 *   --file <path>       Path to topics.json (default: data/topics.json)
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { validateTopicsData, DataValidationError } from "../src/data.js";
import { getTodayDateKey } from "../src/time-limit.js";
import { extractVideoId, verifyVideo } from "./lib/youtube-verify.mjs";
import { upsertVideo, generateTopicId, TopicsStoreError } from "./lib/topics-store.mjs";

const DEFAULT_TOPICS_FILE = fileURLToPath(new URL("../data/topics.json", import.meta.url));

function parseArgs(argv) {
  const args = { approve: false };
  const positional = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--topic":
        args.topic = argv[++i];
        break;
      case "--new-topic":
        args.newTopic = argv[++i];
        break;
      case "--id":
        args.id = argv[++i];
        break;
      case "--emoji":
        args.emoji = argv[++i];
        break;
      case "--subtitle":
        args.subtitle = argv[++i];
        break;
      case "--section":
        args.section = argv[++i];
        break;
      case "--lang":
        args.lang = argv[++i];
        break;
      case "--approve":
        args.approve = true;
        break;
      case "--file":
        args.file = argv[++i];
        break;
      default:
        positional.push(arg);
    }
  }

  args.url = positional[0];
  return args;
}

function fail(message) {
  console.error(`✖ ${message}`);
  process.exitCode = 1;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const topicsFile = args.file ?? DEFAULT_TOPICS_FILE;

  if (!args.url) return fail("missing video URL (positional argument)");
  if (!args.topic && !args.newTopic) return fail("pass either --topic <id> or --new-topic <title>");
  if (args.topic && args.newTopic) return fail("pass only one of --topic or --new-topic, not both");
  if (!args.section) return fail("--section <label> is required");
  if (!args.lang || !["ko", "en"].includes(args.lang)) return fail("--lang must be 'ko' or 'en'");

  const videoId = extractVideoId(args.url);
  if (!videoId) return fail(`could not extract a YouTube video id from "${args.url}"`);

  console.log(`Verifying ${videoId} against YouTube...`);
  const verification = await verifyVideo(videoId);
  if (!verification.ok) {
    return fail(`rejected: ${verification.reason}`);
  }

  const raw = await readFile(topicsFile, "utf8");
  let data;
  try {
    data = validateTopicsData(JSON.parse(raw));
  } catch (error) {
    if (error instanceof DataValidationError) {
      return fail(`existing ${topicsFile} is invalid: ${error.message}`);
    }
    throw error;
  }

  if (args.topic && !data.topics.some((t) => t.id === args.topic)) {
    return fail(`topic "${args.topic}" does not exist. Use --new-topic to create it.`);
  }

  const topicId = args.topic ?? generateTopicId(args.newTopic, args.id);

  const video = {
    videoId,
    title: verification.title,
    channel: verification.channel,
    lang: args.lang,
    durationSec: verification.durationSec ?? 0,
    approved: args.approve,
    verifiedAt: getTodayDateKey(),
  };

  let updated;
  try {
    updated = upsertVideo(data, {
      topicId,
      topicTitle: args.newTopic,
      topicEmoji: args.emoji,
      topicSubtitle: args.subtitle,
      sectionLabel: args.section,
      video,
    });
  } catch (error) {
    if (error instanceof TopicsStoreError) {
      return fail(error.message);
    }
    throw error;
  }

  validateTopicsData(updated); // defensive re-check before writing

  await writeFile(topicsFile, `${JSON.stringify(updated, null, 2)}\n`, "utf8");

  console.log(`✔ Added "${video.title}" (${video.channel}, ${video.durationSec}s)`);
  console.log(`  topic: ${topicId} | section: "${args.section}" | lang: ${args.lang}`);
  console.log(
    args.approve
      ? "  status: approved (visible to child immediately)"
      : "  status: pending review — open parent mode to approve before it shows up"
  );
}

main().catch((error) => {
  console.error("✖ unexpected error:", error);
  process.exitCode = 1;
});
