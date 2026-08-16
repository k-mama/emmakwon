#!/usr/bin/env node
// Generates migrations/0002_seed_published_posts.sql from
// src/content/studio-posts.json, which is the single source of truth for
// public Studio content.
//
// The generated SQL is intentionally gitignored. Never trust a previously
// generated copy during recovery: create it immediately before use from the
// exact Git commit whose published content you intend to restore.
//
// The SQL is an idempotent upsert (ON CONFLICT(id) DO UPDATE). It restores
// published rows only and never recreates private drafts that exist solely
// in D1. Do not run it against a live D1 that may contain newer unpublished
// edits on already-published rows; use a full D1 backup or Time Travel for
// that case instead.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const postsPath = path.join(root, "src/content/studio-posts.json");
const outPath = path.join(root, "migrations/0002_seed_published_posts.sql");

const posts = JSON.parse(readFileSync(postsPath, "utf8"));
if (!Array.isArray(posts) || posts.some((post) => post?.status !== "published")) {
  throw new Error("Studio public JSON must contain published posts only before generating a recovery seed.");
}

function sqlString(value) {
  if (value === undefined || value === null) return "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlJson(value) {
  if (value === undefined || value === null) return "NULL";
  return sqlString(JSON.stringify(value));
}

const columns = [
  "id",
  "title",
  "slug",
  "excerpt",
  "cover_image",
  "body",
  "category",
  "tags",
  "status",
  "published_at",
  "scheduled_at",
  "created_at",
  "updated_at",
  "seo_title",
  "seo_description",
  "external_media",
];

const statements = posts.map((post) => {
  const values = [
    sqlString(post.id),
    sqlString(post.title),
    sqlString(post.slug),
    sqlString(post.excerpt),
    sqlString(post.coverImage),
    sqlJson(post.body),
    sqlString(post.category),
    sqlJson(post.tags ?? []),
    sqlString(post.status),
    sqlString(post.publishedAt),
    sqlString(post.scheduledAt),
    sqlString(post.createdAt),
    sqlString(post.updatedAt),
    sqlString(post.seoTitle),
    sqlString(post.seoDescription),
    sqlJson(post.externalMedia),
  ];

  const updateSet = columns
    .filter((column) => column !== "id" && column !== "created_at")
    .map((column) => `${column}=excluded.${column}`)
    .join(", ");

  return [
    `INSERT INTO studio_posts (${columns.join(", ")}, github_commit_sha, last_publish_error)`,
    `VALUES (${values.join(", ")}, NULL, NULL)`,
    `ON CONFLICT(id) DO UPDATE SET ${updateSet};`,
  ].join("\n");
});

const sql = `-- Generated on demand by scripts/generate-studio-seed.mjs from
-- src/content/studio-posts.json. This file is gitignored; regenerate it
-- immediately before use from the Git revision you intend to restore.
--
-- Run only after reviewing STUDIO_DATA_RECOVERY.md.

${statements.join("\n\n")}\n`;

writeFileSync(outPath, sql);
console.log(`Generated ${path.relative(root, outPath)} from ${posts.length} published posts.`);
