#!/usr/bin/env node
import fs from "node:fs";
import { execFileSync } from "node:child_process";

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function fail(message) {
  console.error(`\nDeploy-intent check failed:\n- ${message}`);
  process.exit(1);
}

const eventName = process.env.GITHUB_EVENT_NAME ?? "local";
const refName = process.env.GITHUB_REF_NAME ?? "";

// This policy gate is meaningful only for pushes to the production branch.
// Pull requests and local release verification still run the ordinary code,
// security, Functions, lint, build, and static-export checks separately.
if (eventName !== "push" || refName !== "main") {
  console.log(`Deploy-intent check skipped for event=${eventName} ref=${refName || "(local)"}.`);
  process.exit(0);
}

const message = git(["log", "-1", "--pretty=%B"]);
const files = git(["diff", "--name-only", "HEAD^", "HEAD"])
  .split(/\r?\n/)
  .map((file) => file.trim())
  .filter(Boolean);

const onlyFile = (path) => files.length === 1 && files[0] === path;

if (message.includes("[CF-Pages-Skip]")) {
  console.log(`Deploy-intent check passed: iterative commit is explicitly Cloudflare-skipped (${files.length} file(s)).`);
  process.exit(0);
}

if (message.startsWith("Publish Studio note:") || message.startsWith("Remove Studio note:")) {
  if (!onlyFile("src/content/studio-posts.json")) {
    fail("Studio Publish/Remove commits may change only src/content/studio-posts.json.");
  }
  console.log("Deploy-intent check passed: intentional Studio content publish/remove commit.");
  process.exit(0);
}

if (message.startsWith("Release production:")) {
  if (!onlyFile("RELEASE_ACCEPTANCE.md")) {
    fail("A production release-trigger commit may change only RELEASE_ACCEPTANCE.md.");
  }
  const acceptance = fs.readFileSync("RELEASE_ACCEPTANCE.md", "utf8");
  if (!/^Status:\s*`RELEASED`\s*$/m.test(acceptance)) {
    fail("Release production commit requires RELEASE_ACCEPTANCE.md status to be RELEASED.");
  }
  console.log("Deploy-intent check passed: intentional production release trigger.");
  process.exit(0);
}

if (message.startsWith("Rollback production to verified snapshot")) {
  console.log(`Deploy-intent check passed: explicit production rollback commit (${files.length} file(s)).`);
  process.exit(0);
}

fail(
  "Non-skip push to main is not an approved deployment intent. Use [CF-Pages-Skip] for iterative work, or an approved Studio publish, Release production, or verified rollback commit.",
);
