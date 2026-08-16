import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const failures = [];

function fail(message) {
  failures.push(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

const trackedFiles = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" })
  .split(/\r?\n/)
  .map((file) => file.trim())
  .filter(Boolean);

const forbiddenTrackedFiles = [
  /^\.env(?:\.|$)/i,
  /^\.dev\.vars(?:\.|$)/i,
  /^\.wrangler(?:\/|$)/i,
  /(?:^|\/)wrangler\.toml$/i,
  /\.pem$/i,
];

for (const file of trackedFiles) {
  if (forbiddenTrackedFiles.some((pattern) => pattern.test(file))) {
    fail(`Sensitive/local-only file must not be tracked: ${file}`);
  }
}

const gitignore = read(".gitignore");
for (const required of [".env*", ".dev.vars", ".dev.vars.*", ".wrangler/", "*.pem"]) {
  if (!gitignore.includes(required)) fail(`.gitignore is missing required protection: ${required}`);
}

const wranglerLocal = read("wrangler.local.toml");
if (/\bpages_build_output_dir\s*=/.test(wranglerLocal)) {
  fail("wrangler.local.toml must not declare pages_build_output_dir; production Pages config lives in Cloudflare dashboard.");
}

const databaseId = wranglerLocal.match(/\bdatabase_id\s*=\s*"([^"]+)"/)?.[1];
if (!databaseId) {
  fail("wrangler.local.toml must keep an explicit placeholder database_id for local D1 configuration.");
} else if (databaseId !== "REPLACE_WITH_REAL_D1_DATABASE_ID") {
  fail("wrangler.local.toml contains a non-placeholder D1 database_id. Keep production identifiers out of the repository.");
}

const textExtensions = new Set([
  ".css", ".html", ".js", ".json", ".md", ".mjs", ".sql", ".toml", ".ts", ".tsx", ".txt", ".yml", ".yaml",
]);
const tokenPatterns = [
  { name: "GitHub classic token", regex: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/g },
  { name: "GitHub fine-grained token", regex: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g },
  { name: "private key", regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
];

for (const file of trackedFiles) {
  if (file.startsWith("src/content/generated/")) continue;
  if (!textExtensions.has(path.extname(file).toLowerCase())) continue;

  const absolute = path.join(ROOT, file);
  if (!fs.existsSync(absolute) || fs.statSync(absolute).size > 2_000_000) continue;

  const content = fs.readFileSync(absolute, "utf8");
  for (const { name, regex } of tokenPatterns) {
    regex.lastIndex = 0;
    if (regex.test(content)) fail(`${name} pattern detected in tracked file: ${file}`);
  }
}

if (failures.length) {
  console.error("\nRepository security check failed:");
  for (const message of failures) console.error(`- ${message}`);
  console.error(`\n${failures.length} security invariant failure(s).`);
  process.exit(1);
}

console.log(`Repository security check passed: ${trackedFiles.length} tracked files inspected; local secrets/config invariants preserved.`);
