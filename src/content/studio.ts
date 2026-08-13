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
    cta: { label: "WATCH ON YOUTUBE", href: "#" },
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
    cta: { label: "SEE WHAT I'M MAKING", href: "#" },
  },
};

// Newest first is not required here — getPublishedPosts() sorts by
// publishedAt — but kept roughly chronological for readability.
export const studioPosts: StudioPost[] = [
  {
    id: "post-1",
    title: "Rebuilding EmmaKwon.com with AI",
    slug: "rebuilding-emmakwon-with-ai",
    excerpt:
      "This site has gone through more rebuilds than I'd like to admit. Here's what it actually looks like to design in the browser with an AI that never gets tired of your notes.",
    body: [
      "I didn't design this site once and ship it. I designed it maybe thirty times, in small pieces, over weeks — a hero that felt too tall, a header that drifted too far right, a background that looked like a pinwheel instead of an atmosphere.",
      "The process that worked was small, specific corrections. Not 'make it better' — that never works. 'The video feels like a giant poster, restore the version where it breathes.' 'The gold hover feels cheap, use the pink from the hair.' Precise notes, one change at a time.",
      "The AI is fast. It is not tasteful on its own. Taste is still the part I have to bring — I just get to see it rendered in minutes instead of days.",
    ],
    category: "BUILD",
    tags: ["ai workflow", "web design", "claude code"],
    status: "published",
    publishedAt: "2026-08-10T09:00:00+10:00",
    createdAt: "2026-08-07T18:20:00+10:00",
    updatedAt: "2026-08-10T09:00:00+10:00",
    seoTitle: "Rebuilding EmmaKwon.com with AI",
    seoDescription: "A behind-the-scenes look at rebuilding this site in small, precise corrections with an AI coding assistant.",
  },
  {
    id: "post-2",
    title: "Making (and Remaking) the Favicon",
    slug: "making-the-favicon",
    excerpt:
      "A tiny 32-pixel icon took five separate rounds to get right. What that taught me about restraint.",
    body: [
      "I asked for a monogram. Then a star. Then a full aurora gradient circle. Then I looked at it next to the header and it felt loud, so I stripped it back to a plain navy E.",
      "Then I missed the circle. The final version keeps the circular badge and the aurora gradient, just with the E sized up slightly so it holds its own inside the badge.",
      "Small things get to be iterated on exactly like big things. Nobody sees the four versions that didn't make it — they just see the tab.",
    ],
    category: "BUILD",
    tags: ["branding", "iteration", "favicon"],
    status: "published",
    publishedAt: "2026-08-03T09:00:00+10:00",
    createdAt: "2026-08-01T14:10:00+10:00",
    updatedAt: "2026-08-03T09:00:00+10:00",
    seoTitle: "Making (and Remaking) the Favicon",
    seoDescription: "Five rounds of iteration on a 32-pixel favicon, and what it taught me about restraint.",
  },
  {
    id: "post-3",
    title: "Using NotebookLM After English Class",
    slug: "notebooklm-after-english-class",
    excerpt:
      "My class notes are messy. Reorganizing them with NotebookLM turned an hour of class into something I can actually study from.",
    body: [
      "Language school moves fast. I write down phrases as I hear them, half in English, half in shorthand only I understand.",
      "After class, I feed the messy notes into NotebookLM and ask it to organize them by topic instead of by the order I heard them in. That's it — no rewriting, no simplifying, just reorganizing.",
      "It's not a study app. It's just a second pass at my own notes, done in minutes instead of never.",
    ],
    category: "BUILD",
    tags: ["notebooklm", "workflow", "english learning"],
    status: "published",
    publishedAt: "2026-07-27T09:00:00+10:00",
    createdAt: "2026-07-25T20:05:00+10:00",
    updatedAt: "2026-07-27T09:00:00+10:00",
    seoTitle: "Using NotebookLM After English Class",
    seoDescription: "How I turn messy language-school notes into study material with NotebookLM.",
  },
  {
    id: "post-4",
    title: "English I'm Learning in Brisbane",
    slug: "english-im-learning-in-brisbane",
    excerpt:
      "I'm not a teacher. I'm a student writing down what I'm learning so I understand it better — and maybe it helps you too.",
    body: [
      "I got on the AI wave at 50. Around the same time, I started English classes in Brisbane, which turned out to be its own kind of steep learning curve.",
      "This isn't a course. I'm not qualified to teach anyone English. What I am doing is writing down the phrases, mistakes, and small breakthroughs from class each week, mostly so I remember them.",
      "If a note here happens to help someone else learning English, that's a nice side effect — not the point.",
    ],
    category: "LEARN",
    tags: ["english learning", "brisbane", "language school"],
    status: "published",
    publishedAt: "2026-07-20T09:00:00+10:00",
    createdAt: "2026-07-18T19:30:00+10:00",
    updatedAt: "2026-07-20T09:00:00+10:00",
    seoTitle: "English I'm Learning in Brisbane",
    seoDescription: "Notes from language school in Brisbane, written down as I learn, not as a teacher.",
    externalMedia: [{ label: "Watch on YouTube", url: "#" }],
  },
  {
    id: "post-5",
    title: "What's Next for Sly Fairy",
    slug: "whats-next-for-sly-fairy",
    excerpt:
      "Sly Fairy started as a song. It's turning into a character, a visual world, and a lot of unfinished experiments.",
    body: [
      "Sly Fairy began as an EMMAESTRO track. Somewhere in the process of making the cover art and the video, she started to feel like a character rather than a title.",
      "Right now that means a growing pile of visual experiments — some that will become part of her world, most that won't.",
      "The finished pieces live in Sly Fairy's own world on this site. This note is just the unfinished version of that — what's currently on the workbench.",
    ],
    category: "MAKE",
    tags: ["sly fairy", "current work", "visual experiments"],
    status: "published",
    publishedAt: "2026-07-13T09:00:00+10:00",
    createdAt: "2026-07-10T11:45:00+10:00",
    updatedAt: "2026-07-13T09:00:00+10:00",
    seoTitle: "What's Next for Sly Fairy",
    seoDescription: "Current visual experiments and what's next for the Sly Fairy character world.",
  },
];

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
