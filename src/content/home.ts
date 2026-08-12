// Typed content for the HOME page (sections below the locked Hero).
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
  cta: string;
  href: string;
  image: string;
};

const worlds: World[] = [
  {
    name: "SLY FAIRY",
    descriptor: "Character and cinematic world",
    cta: "ENTER SLY FAIRY",
    href: "#",
    image: "/archive/emmaestro/sly-fairy-album-cover.jpg",
  },
  {
    name: "EMMAESTRO",
    descriptor: "Music, produced and performed",
    cta: "ENTER EMMAESTRO",
    href: "#",
    image: "/archive/emmaestro/aussie-album-cover.jpg",
  },
  {
    name: "K-MAMA",
    descriptor: "Children's creative world",
    cta: "MEET K-MAMA",
    href: "#",
    image: "/archive/k-mama/coloring-book-en.jpg",
  },
  {
    name: "BOOKS",
    descriptor: "Books and publishing, led by Born Rare",
    cta: "ENTER BOOKS",
    href: "#",
    image: "/archive/born-rare/born-rare-book-cover.jpg",
  },
];

export const curatedWorlds = {
  eyebrow: "INSIDE THE HOUSE",
  headline: "Four rooms. One creative house.",
  worlds,
};

export type StudioLink = {
  label: string;
  href: string;
};

export const studioMethod = {
  eyebrow: "STUDIO",
  headline: "AI builds fast. Taste decides what stays.",
  body: "Every project here starts as a fast, AI-assisted draft — then gets edited, rejected, or rebuilt until it actually feels right.",
  pullQuote: "The first version is rarely the version that ships.",
  links: [
    { label: "WATCH ME BUILD", href: "#" },
    { label: "STUDIO NOTES", href: "#" },
    { label: "YOUTUBE", href: "#" },
    { label: "AI PROCESS", href: "#" },
  ] satisfies StudioLink[],
};

export type ContactMethod = {
  label: string;
  href: string;
};

export const contact = {
  headline: "LET'S MAKE SOMETHING INTERESTING.",
  supporting: "Publishing, music, visual worlds, collaborations, or simply hello.",
  cta: { label: "GET IN TOUCH", href: "#" } satisfies ContactMethod,
  methods: [
    { label: "Email", href: "#" },
    { label: "Instagram", href: "#" },
    { label: "YouTube", href: "#" },
  ] satisfies ContactMethod[],
};

export const footer = {
  brand: "Emma Kwon",
  year: 2026,
};
