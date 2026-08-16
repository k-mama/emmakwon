#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const input = process.argv[2];
if (!input) {
  console.error("Usage: node scripts/verify-studio-backup.mjs <path-to-backup.sql>");
  process.exit(2);
}

const sqlPath = path.resolve(input);
const checksumPath = `${sqlPath}.sha256`;

if (!existsSync(sqlPath)) {
  console.error(`Backup file not found: ${sqlPath}`);
  process.exit(1);
}
if (!existsSync(checksumPath)) {
  console.error(`Checksum file not found: ${checksumPath}`);
  process.exit(1);
}

const sql = readFileSync(sqlPath);
const text = sql.toString("utf8");
if (!text.includes("studio_posts")) {
  console.error("Backup does not contain the studio_posts table.");
  process.exit(1);
}

const actual = createHash("sha256").update(sql).digest("hex");
const checksumLine = readFileSync(checksumPath, "utf8").trim();
const expected = checksumLine.split(/\s+/)[0]?.toLowerCase();

if (!expected || expected !== actual) {
  console.error("Backup checksum mismatch. Do not restore from this file.");
  process.exit(1);
}

console.log(`Backup integrity OK: ${path.basename(sqlPath)}`);
console.log(`Bytes: ${statSync(sqlPath).size}`);
console.log(`SHA-256: ${actual}`);
