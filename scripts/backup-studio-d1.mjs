#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const backupDir = path.join(root, ".studio-backups");
const wranglerConfig = path.join(root, "wrangler.local.toml");

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z").replace("T", "-");
}

mkdirSync(backupDir, { recursive: true });

const baseName = `studio-d1-${timestamp()}`;
const sqlPath = path.join(backupDir, `${baseName}.sql`);
const checksumPath = `${sqlPath}.sha256`;
const manifestPath = path.join(backupDir, `${baseName}.json`);
const npx = process.platform === "win32" ? "npx.cmd" : "npx";

const args = [
  "wrangler",
  "d1",
  "export",
  "STUDIO_DB",
  "--remote",
  "--config",
  wranglerConfig,
  "--output",
  sqlPath,
  "--skip-confirmation",
];

console.log("Exporting remote Studio D1 database to private local backup…");
const result = spawnSync(npx, args, { cwd: root, stdio: "inherit" });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

const sql = readFileSync(sqlPath);
const text = sql.toString("utf8");
if (!text.includes("studio_posts")) {
  throw new Error("Backup export does not contain the studio_posts table. The backup was not accepted.");
}

const sha256 = createHash("sha256").update(sql).digest("hex");
const bytes = statSync(sqlPath).size;
writeFileSync(checksumPath, `${sha256}  ${path.basename(sqlPath)}\n`, "utf8");
writeFileSync(
  manifestPath,
  `${JSON.stringify(
    {
      createdAt: new Date().toISOString(),
      source: "Cloudflare D1 remote STUDIO_DB",
      file: path.basename(sqlPath),
      bytes,
      sha256,
      restoreIsDestructive: true,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(`Backup verified: ${path.relative(root, sqlPath)}`);
console.log(`SHA-256: ${sha256}`);
console.log("Move a long-term copy to private storage; never commit .studio-backups/ to Git.");
