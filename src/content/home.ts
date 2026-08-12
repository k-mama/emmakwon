// Typed content for the HOME page (sections B–G, below the locked Hero).
// Kept separate from presentation components so copy and assets can change
// without touching component code.

export const brandStatement = {
  eyebrow: "ONE-PERSON CREATIVE HOUSE",
  headline: "Not a portfolio. A house.",
  lede: "I got on the AI wave at 50. I'm 52 now.",
  lines: [
    "Since then: books, music, visual worlds, and studio experiments — built at a pace that used to take a team.",
    "Every world below lives under the same roof.",
  ],
  image: "/archive/emma/studio-candid.jpg",
  imageAlt: "Emma Kwon in the studio",
};

export type World = {
  name: string;
  descriptor: string;
  href: string;
  size: "xl" | "l" | "m" | "s";
  image?: string;
};

const worlds: World[] = [
  {
    name: "EMMAESTRO",
    descriptor: "Music, produced and performed",
    href: "#",
    size: "xl",
    image: "/archive/emmaestro/aussie-album-cover.jpg",
  },
  {
    name: "BORN RARE",
    descriptor: "A book",
    href: "#",
    size: "l",
    image: "/archive/born-rare/born-rare-book-cover.jpg",
  },
  {
    name: "SLY FAIRY",
    descriptor: "An emerging cinematic world",
    href: "#",
    size: "m",
    image: "/archive/emmaestro/sly-fairy-album-cover.jpg",
  },
  {
    name: "K-MAMA",
    descriptor: "Coloring books for curious kids",
    href: "#",
    size: "m",
    image: "/archive/k-mama/coloring-book-en.jpg",
  },
  {
    name: "AMAZING TIGER PUBLISHING",
    descriptor: "The imprint behind it all",
    href: "#",
    size: "s",
  },
];

export const curatedWorlds = {
  eyebrow: "WORLDS",
  headline: "Five worlds. One house.",
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
    { label: "EXPLORE THE WORLDS", href: "#worlds" },
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
