// Typed content for the STUDIO section (/studio, /studio/notes,
// /studio/notes/[slug]). Kept separate from presentation components so
// copy and posts can change without touching component code — and typed
// so this can later be swapped for a real CMS/data source without
// changing how the pages consume it.

export type StudioCategory = "LEARN" | "BUILD" | "MAKE";

export type StudioPostStatus = "draft" | "scheduled" | "published";

/** A future-facing pointer to external media (YouTube, etc.) — Phase 2
    prepares the field; no API integration happens yet. */
export type StudioMediaRef = {
  label: string;
  url: string;
};

export type StudioPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage?: string;
  /** Plain paragraphs for Phase 1/2 — no rich text/markdown yet. */
  body: string[];
  category: StudioCategory;
  tags: string[];
  status: StudioPostStatus;
  /** ISO date. Set once status becomes "published". */
  publishedAt?: string;
  /** ISO datetime (includes time). Set while status is "scheduled". Always
      interpreted and displayed in Australia/Brisbane in the admin UI. */
  scheduledAt?: string;
  /** ISO datetime. */
  createdAt: string;
  /** ISO datetime. */
  updatedAt: string;
  seoTitle?: string;
  seoDescription?: string;
  externalMedia?: StudioMediaRef[];
};

export const studioHero = {
  eyebrow: "STUDIO",
  headlineLines: ["What I'm learning.", "What I'm making.", "What actually worked."],
  supporting: "Notes from the work behind Emma Kwon.",
};

export const studioWorkbench = {
  eyebrow: "ON THE WORKBENCH",
  title: "Three ways the work moves.",
  intro:
    "This room is designed to stay useful while the projects keep changing. Notes, experiments, finished pieces, and things still becoming can all enter through the same three doors.",
  items: [
    {
      label: "01 / LEARN",
      title: "Notice something new.",
      note: "Language, tools, methods, and the useful things that are still being learned in public.",
      href: "#learn",
    },
    {
      label: "02 / BUILD",
      title: "Make the system work.",
      note: "Websites, AI workflows, publishing systems, experiments, and the engineering behind the visible work.",
      href: "#build",
    },
    {
      label: "03 / MAKE",
      title: "Turn it into something.",
      note: "Music, characters, books, films, and whatever leaves the workbench next.",
      href: "#make",
      media: {
        src: "/archive/emma/studio-candid.jpg",
        alt: "Emma Kwon working in the studio.",
      },
    },
  ],
};

export type StudioPillar = {
  number: string;
  label: string;
  headline: string;
  descriptor: string;
  cta: { label: string; href: string };
};

export const studioPillars: Record<"learn" | "build" | "make", StudioPillar> = {
  learn: {
    number: "01",
    label: "LEARN",
    headline: "What I'm learning.",
    descriptor: "English I'm learning in Brisbane.",
    cta: { label: "VIEW STUDIO NOTES", href: "/studio/notes/" },
  },
  build: {
    number: "02",
    label: "BUILD",
    headline: "How I make things with AI.",
    descriptor: "Real projects, real prompts, what actually worked.",
    cta: { label: "VIEW ALL NOTES", href: "/studio/notes/" },
  },
  make: {
    number: "03",
    label: "MAKE",
    headline: "What I'm making now.",
    descriptor: "Music, characters, books, and whatever I'm making next.",
    cta: { label: "VIEW STUDIO NOTES", href: "/studio/notes/" },
  },
};

// The public, machine-writable content source. This file contains ONLY
// published posts — the "Publish Now" Pages Function reads and writes
// this exact file via the GitHub Contents API, then commits it, which is
// what triggers the existing Cloudflare Pages Git deployment. Publishing
// is manual only; drafts and any scheduled posts live only in D1 (see
// migrations/) and must never be written here early.
import studioPostsData from "./studio-posts.json";

export const studioPosts: StudioPost[] = studioPostsData as StudioPost[];

function byPublishedAtDesc(a: StudioPost, b: StudioPost): number {
  const aTime = new Date(a.publishedAt ?? a.createdAt).getTime();
  const bTime = new Date(b.publishedAt ?? b.createdAt).getTime();
  return bTime - aTime;
}

export function getPublishedPosts(): StudioPost[] {
  return studioPosts.filter((post) => post.status === "published").sort(byPublishedAtDesc);
}

export function getPostsByCategory(category: StudioCategory): StudioPost[] {
  return getPublishedPosts().filter((post) => post.category === category);
}

export function getFeaturedPost(category?: StudioCategory): StudioPost | undefined {
  const posts = category ? getPostsByCategory(category) : getPublishedPosts();
  return posts[0];
}

export function getPostBySlug(slug: string): StudioPost | undefined {
  return studioPosts.find((post) => post.slug === slug && post.status === "published");
}

export function formatStudioDate(dateInput: string): string {
  return new Date(dateInput).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export const SCHEDULING_TIMEZONE = "Australia/Brisbane";

/** Formats a datetime explicitly in Australia/Brisbane, with the zone name
    always visible, so the admin can never mistake it for UTC or local time. */
export function formatBrisbaneDateTime(dateInput: string): string {
  const date = new Date(dateInput);
  const datePart = date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: SCHEDULING_TIMEZONE,
  });
  const timePart = date.toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: SCHEDULING_TIMEZONE,
  });
  return `${datePart}, ${timePart} ${SCHEDULING_TIMEZONE}`;
}

/** Combines a YYYY-MM-DD date and HH:mm time, both entered as
    Australia/Brisbane wall-clock values, into an ISO datetime. Brisbane
    (Queensland) does not observe daylight saving, so its UTC offset is
    always a fixed +10:00 — no timezone library needed for this. */
export function brisbaneWallTimeToIso(date: string, time: string): string {
  return `${date}T${time}:00+10:00`;
}

const COMBINING_MARKS = new RegExp("[̀-ͯ]", "g");

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
