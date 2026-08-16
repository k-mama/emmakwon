#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const checker = path.join(root, "scripts/check-deploy-intent.mjs");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "emmakwon-deploy-intent-"));

function git(args) {
  return execFileSync("git", args, { cwd: tmp, encoding: "utf8" }).trim();
}

function write(relative, content) {
  const absolute = path.join(tmp, relative);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, content);
}

function commit(message) {
  git(["add", "-A"]);
  git(["commit", "-m", message]);
}

function runChecker() {
  return spawnSync(process.execPath, [checker], {
    cwd: tmp,
    encoding: "utf8",
    env: {
      ...process.env,
      GITHUB_EVENT_NAME: "push",
      GITHUB_REF_NAME: "main",
    },
  });
}

function expect(label, expectedSuccess) {
  const result = runChecker();
  const actualSuccess = result.status === 0;
  if (actualSuccess !== expectedSuccess) {
    console.error(`Deploy-intent policy test failed: ${label}`);
    console.error(result.stdout);
    console.error(result.stderr);
    process.exit(1);
  }
}

try {
  git(["init"]);
  git(["config", "user.name", "QA20 Policy Test"]);
  git(["config", "user.email", "qa20@example.invalid"]);

  write("RELEASE_ACCEPTANCE.md", "Status: `RC_PENDING_CLOUDFLARE_CAPACITY`\n");
  write("src/content/studio-posts.json", "[]\n");
  write("scratch.txt", "base\n");
  commit("[CF-Pages-Skip] test base");

  write("scratch.txt", "skip\n");
  commit("[CF-Pages-Skip] iterative work");
  expect("skip commit", true);

  write("src/content/studio-posts.json", "[{\"id\":\"post-test\"}]\n");
  commit("Publish Studio note: Test note");
  expect("Studio publish only public JSON", true);

  write("src/content/studio-posts.json", "[]\n");
  write("scratch.txt", "bad studio side change\n");
  commit("Publish Studio note: Bad extra file");
  expect("Studio publish with extra file", false);

  // Return both files to their pre-test values in a skipped commit so the
  // next release scenario has exactly one changed file.
  write("src/content/studio-posts.json", "[{\"id\":\"post-test\"}]\n");
  write("scratch.txt", "skip\n");
  commit("[CF-Pages-Skip] reset fixture");

  write("RELEASE_ACCEPTANCE.md", "Status: `RELEASED`\n");
  commit("Release production: QA20 test");
  expect("release trigger only acceptance file", true);

  write("RELEASE_ACCEPTANCE.md", "Status: `RC_PENDING_CLOUDFLARE_CAPACITY`\n");
  commit("[CF-Pages-Skip] reset release fixture");

  write("RELEASE_ACCEPTANCE.md", "Status: `RELEASED`\n");
  write("scratch.txt", "bad release side change\n");
  commit("Release production: Bad extra file");
  expect("release trigger with extra file", false);

  write("scratch.txt", "ordinary non-skip\n");
  commit("Ordinary commit without skip");
  expect("unclassified non-skip commit", false);

  write("scratch.txt", "rollback\n");
  commit("Rollback production to verified snapshot deadbeef");
  expect("explicit rollback commit", true);

  console.log("Deploy-intent policy tests passed: skip, Studio, release, invalid non-skip, and rollback cases verified.");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
