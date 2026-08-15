// Typed content for the HOME page.
// Keep copy and media choices separate from presentation components so
// homepage media can evolve without rebuilding the page structure.

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
  category: string;
  descriptor: string;
  cta: string;
  href: string;
  image: string;
};

const worlds: World[] = [
  {
    name: "SLY FAIRY",
    category: "ORIGINAL STORY WORLD",
    descriptor: "A celestial fixer gets close enough to human life to be wrong.",
    cta: "ENTER SLY FAIRY",
    href: "/sly-fairy/",
    image: "/media/sly-fairy/home-composing.webp",
  },
  {
    name: "EMMAESTRO",
    category: "MUSIC",
    descriptor: "Records, scores, and the work behind the sound.",
    cta: "ENTER EMMAESTRO",
    href: "/emmaestro/",
    image: "/archive/emmaestro/aussie-album-cover.jpg",
  },
  {
    name: "K-MAMA",
    category: "CHILDREN'S WORLD",
    descriptor: "Made for children. Never talked down to.",
    cta: "MEET K-MAMA",
    href: "/k-mama/",
    image: "/archive/k-mama/coloring-book-en.jpg",
  },
  {
    name: "BOOKS",
    category: "BOOKS & PUBLISHING",
    descriptor: "Life first. The book came after.",
    cta: "ENTER BOOKS",
    href: "/books/",
    image: "/archive/born-rare/born-rare-book-cover.jpg",
  },
];

export const curatedWorlds = {
  eyebrow: "INSIDE THE HOUSE",
  headline: "Different rooms. One roof.",
  worlds,
};

export const houseIndex = {
  eyebrow: "THE CREATIVE HOUSE",
  headline: "Different rooms. One roof.",
  supporting:
    "Music, books, character worlds, children's work, and the notes made while building all of it.",
  feature: {
    eyebrow: "FEATURED WORLD",
    title: "SLY FAIRY",
    body: "Why would anyone choose a life they cannot keep?",
    supporting:
      "An original story world about usefulness, choice, music, and the difference between helping someone and deciding for them.",
    href: "/sly-fairy/",
    cta: "ENTER THE WORLD",
    image: "/media/sly-fairy/home-composing.webp",
    imageAlt: "Sly Fairy composing music beside a companion at sunset.",
  },
  rooms: [
    {
      category: "MUSIC",
      name: "EMMAESTRO",
      href: "/emmaestro/",
      descriptor: "Records, scores, and the work behind the sound.",
    },
    {
      category: "CHILDREN'S WORLD",
      name: "K-MAMA",
      href: "/k-mama/",
      descriptor: "Made for children. Never talked down to.",
    },
    {
      category: "BOOKS & PUBLISHING",
      name: "BOOKS",
      href: "/books/",
      descriptor: "Life first. The book came after.",
    },
    {
      category: "NOTES · LEARN · BUILD · MAKE",
      name: "STUDIO",
      href: "/studio/",
      descriptor: "AI builds fast. Taste decides what stays.",
    },
  ],
};

export type StudioLink = {
  label: string;
  href: string;
};

export const studioMethod = {
  eyebrow: "THE WORKING ROOM",
  headline: "AI builds fast. Taste decides what stays.",
  body: "The finished work lives upstairs. This is the room behind it — drafts, decisions, experiments, and the parts that had to be rebuilt before they felt right.",
  pullQuote: "The first version is rarely the version that ships.",
  links: [
    { label: "WATCH ME BUILD", href: "/studio/#build" },
    { label: "STUDIO NOTES", href: "/studio/notes/" },
    { label: "LEARN", href: "/studio/#learn" },
    { label: "MAKE", href: "/studio/#make" },
  ] satisfies StudioLink[],
};

export type ContactMethod = {
  label: string;
  href: string;
};

export const contact = {
  eyebrow: "OPEN DOOR",
  headline: "LET'S MAKE SOMETHING INTERESTING.",
  supporting: "Publishing, music, visual worlds, collaborations, or simply hello.",
  cta: {
    label: "GET IN TOUCH",
    href: "https://www.instagram.com/the_real_emma_kwon",
  } satisfies ContactMethod,
  methods: [
    {
      label: "Instagram",
      href: "https://www.instagram.com/the_real_emma_kwon",
    },
    {
      label: "EMMAESTRO",
      href: "https://www.youtube.com/@emmaestro123",
    },
    {
      label: "K-MAMA English",
      href: "https://www.youtube.com/@kmama_studio",
    },
  ] satisfies ContactMethod[],
};

export const footer = {
  brand: "Emma Kwon",
  year: 2026,
};
