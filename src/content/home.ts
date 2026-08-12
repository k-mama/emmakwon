// Typed content for the HOME page (sections B–G, below the locked Hero).
// Kept separate from presentation components so copy and assets can change
// without touching component code.

export const brandStatement = {
  eyebrow: "ONE-PERSON CREATIVE HOUSE",
  headline: "Not a portfolio. A house.",
  lede: "I got on the AI wave at 50. I'm 52 now.",
  lines: [
    "Since then: books, music, children's stories, and cinematic worlds — each one AI-assisted, each one still entirely mine.",
    "Every world below lives under the same roof.",
  ],
  image: "/archive/emma/portrait-card.png",
  imageAlt: "Emma Kwon portrait",
};

export type World = {
  name: string;
  descriptor: string;
  href: string;
  size: "large" | "medium";
  image?: string;
};

const worlds: World[] = [
  {
    name: "SLY FAIRY",
    descriptor: "The character and cinematic world",
    href: "#",
    size: "large",
    image: "/archive/emmaestro/sly-fairy-album-cover.jpg",
  },
  {
    name: "EMMAESTRO",
    descriptor: "Music, produced and performed",
    href: "#",
    size: "large",
    image: "/archive/emmaestro/aussie-album-cover.jpg",
  },
  {
    name: "K-MAMA",
    descriptor: "Coloring books and kids' songs",
    href: "#",
    size: "medium",
    image: "/archive/k-mama/coloring-book-en.jpg",
  },
  {
    name: "BOOKS",
    descriptor: "Born Rare, from Amazing Tiger Publishing",
    href: "#",
    size: "medium",
    image: "/archive/born-rare/born-rare-book-cover.jpg",
  },
];

export const curatedWorlds = {
  eyebrow: "WORLDS",
  headline: "Four worlds. One house.",
  worlds,
};

export const studioMethod = {
  eyebrow: "STUDIO",
  headline: "AI builds fast. Taste decides what stays.",
  body: "Every project here starts as a fast, AI-assisted draft — then gets edited, rejected, or rebuilt until it actually feels right.",
  pullQuote: "The first version is rarely the version that ships.",
};

export const notesTeaser = {
  eyebrow: "NOTES",
  headline: "Process, shared as it happens.",
  supporting: "Weekly notes and the occasional film from inside the studio — starting soon.",
  status: "COMING SOON",
};

export type DoorPath = {
  label: string;
  href: string;
};

export const closing = {
  headline: "Where would you like to go next?",
  paths: [
    { label: "EXPLORE THE WORLDS", href: "#house" },
    { label: "ENTER THE STUDIO", href: "#studio" },
    { label: "READ THE NOTES", href: "#notes" },
  ] satisfies DoorPath[],
  contact: { label: "Contact", href: "#" } satisfies DoorPath,
};

export const footer = {
  brand: "Emma Kwon",
  year: 2026,
  contact: { label: "Contact", href: "#" } satisfies DoorPath,
};
