#!/usr/bin/env node
/**
 * Permanently deletes a video from data/topics.json (not just hides it — the
 * parent-mode "제거" button does that, locally, on one device). This actually
 * removes the video object and drops any section/topic left empty, then
 * commits and pushes so the change reaches every device on next reload.
 *
 * Usage:
 *   node tools/remove-video.mjs <videoId>
 *   node tools/remove-video.mjs <videoId> --no-push
 *   node tools/remove-video.mjs <videoId> --file <path>
 */

import { readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { validateTopicsData, DataValidationError } from "../src/data.js";
import { removeVideo } from "./lib/topics-store.mjs";

const execFileAsync = promisify(execFile);
const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const DEFAULT_TOPICS_FILE = fileURLToPath(new URL("../data/topics.json", import.meta.url));

function parseArgs(argv) {
  const args = { push: true };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--no-push") args.push = false;
    else if (arg === "--file") args.file = argv[++i];
    else positional.push(arg);
  }
  args.videoId = positional[0];
  return args;
}

function fail(message) {
  console.error(`✖ ${message}`);
  process.exitCode = 1;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const topicsFile = args.file ?? DEFAULT_TOPICS_FILE;
  if (!args.videoId) return fail("usage: node tools/remove-video.mjs <videoId> [--no-push]");

  const raw = await readFile(topicsFile, "utf8");
  let data;
  try {
    data = validateTopicsData(JSON.parse(raw));
  } catch (error) {
    if (error instanceof DataValidationError) return fail(`topics.json is invalid: ${error.message}`);
    throw error;
  }

  const { updated, found } = removeVideo(data, args.videoId);
  if (!found) return fail(`videoId ${args.videoId} not found in topics.json`);

  validateTopicsData(updated);
  await writeFile(topicsFile, `${JSON.stringify(updated, null, 2)}\n`, "utf8");

  console.log(`✔ Removed "${found.video.title}" (${found.topic.title}) from topics.json`);

  if (!args.push) {
    console.log("  Skipped git (--no-push). Remember to commit and push manually.");
    return;
  }

  try {
    await execFileAsync("git", ["add", "data/topics.json"], { cwd: REPO_ROOT });
    await execFileAsync("git", ["commit", "-m", `chore: remove "${found.video.title}"`], { cwd: REPO_ROOT });
    await execFileAsync("git", ["push"], { cwd: REPO_ROOT });
  } catch (error) {
    console.error("✖ git step failed — the file was updated locally, but not committed/pushed.");
    console.error(error.stderr?.toString().trim() || error.message);
    process.exitCode = 1;
    return;
  }

  console.log("  Committed and pushed — every device will see this after the site redeploys (~1 min).");
}

main().catch((error) => {
  console.error("✖ unexpected error:", error);
  process.exitCode = 1;
});
