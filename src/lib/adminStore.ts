// Phase 2 admin persistence.
//
// This site is a Next.js static export (see next.config.ts) deployed to
// Cloudflare Pages — there is no Node server at runtime, so the admin
// cannot call a database or API route directly from here. This store is
// deliberately the smallest thing that lets Emma actually draft, preview,
// and organize posts today: it persists to the browser's localStorage,
// seeded once from the real published content in src/content/studio.ts.
//
// IMPORTANT — what this is NOT: writing here does not touch the live
// public site. The public /studio pages only ever read the `studioPosts`
// array compiled into the static export at build/deploy time. Getting a
// post from "Publish Now" in this admin onto the live site currently
// requires manually adding it to src/content/studio.ts and redeploying
// (see the "Copy as code" action in the post form) — or the small
// Cloudflare Worker + GitHub Action pipeline described in the Phase 2
// report, which is designed but not built in this phase.
//
// Modelled as a proper external store (cached snapshot + subscribe) so
// components read it via useSyncExternalStore instead of effect+setState
// — this project's lint config (react-hooks/set-state-in-effect) treats
// "fetch an external source in an effect" as the anti-pattern and
// specifically recommends useSyncExternalStore for this exact case.
import { useSyncExternalStore } from "react";
import { studioPosts, type StudioPost } from "@/content/studio";

const STORAGE_KEY = "emmakwon-admin-posts-v1";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readRaw(): StudioPost[] | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StudioPost[];
  } catch {
    return null;
  }
}

function writeRaw(posts: StudioPost[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  cachedPosts = posts;
  listeners.forEach((listener) => listener());
}

let cachedPosts: StudioPost[] | null = null;
const listeners = new Set<() => void>();
const EMPTY: StudioPost[] = [];

/** Loads admin posts, seeding from the real published content on first
    run in a given browser so Emma sees her existing work immediately. */
export function loadAdminPosts(): StudioPost[] {
  if (cachedPosts) return cachedPosts;

  const existing = readRaw();
  if (existing) {
    cachedPosts = existing;
    return existing;
  }

  const seeded = studioPosts.map((post) => ({ ...post }));
  writeRaw(seeded);
  return seeded;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getServerSnapshot(): StudioPost[] {
  return EMPTY;
}

/** Reactive read of all admin posts — re-renders the caller whenever any
    upsert/delete happens, in this tab, without an effect. */
export function useAdminPosts(): StudioPost[] {
  return useSyncExternalStore(subscribe, loadAdminPosts, getServerSnapshot);
}

export function getAdminPost(id: string): StudioPost | undefined {
  return loadAdminPosts().find((post) => post.id === id);
}

/** Insert or update a post by id, always bumping updatedAt. */
export function upsertAdminPost(post: StudioPost): StudioPost {
  const posts = loadAdminPosts();
  const next = { ...post, updatedAt: new Date().toISOString() };
  const index = posts.findIndex((existing) => existing.id === post.id);
  const nextPosts = index === -1 ? [...posts, next] : posts.map((existing, i) => (i === index ? next : existing));

  writeRaw(nextPosts);
  return next;
}

export function deleteAdminPost(id: string): void {
  writeRaw(loadAdminPosts().filter((post) => post.id !== id));
}

export function generatePostId(): string {
  if (isBrowser() && "randomUUID" in window.crypto) {
    return window.crypto.randomUUID();
  }
  return `post-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
}

export function createDraftPost(): StudioPost {
  const now = new Date().toISOString();
  return {
    id: generatePostId(),
    title: "",
    slug: "",
    excerpt: "",
    body: [""],
    category: "BUILD",
    tags: [],
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };
}

export function sortByUpdatedDesc(posts: StudioPost[]): StudioPost[] {
  return [...posts].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function getNextScheduledPost(posts: StudioPost[]): StudioPost | undefined {
  return posts
    .filter((post) => post.status === "scheduled" && post.scheduledAt)
    .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())[0];
}
