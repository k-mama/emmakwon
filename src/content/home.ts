// Typed content for the HOME page, sections 02–10.
// Kept separate from presentation components so real assets, copy, and
// future CMS-sourced fields (Studio Notes, Currently Making, the featured
// film) can replace these values without touching component code.

export type ProofWork = {
  title: string;
  category: string;
  image: string;
  alt: string;
  size: "large" | "medium" | "small";
};

export const proofFirst = {
  eyebrow: "A ONE-PERSON CREATIVE HOUSE",
  statement: "Books. Music. Films. Characters. Worlds.",
  works: [
    {
      title: "Born Rare",
      category: "Book",
      image: "/archive/born-rare/born-rare-book-cover.jpg",
      alt: "Born Rare book cover",
      size: "large",
    },
    {
      title: "Sly Fairy",
      category: "Music",
      image: "/archive/emmaestro/sly-fairy-album-cover.jpg",
      alt: "Sly Fairy album cover",
      size: "medium",
    },
    {
      title: "K-Mama Coloring Book",
      category: "Publishing",
      image: "/archive/k-mama/coloring-book-en.jpg",
      alt: "K-Mama coloring book cover",
      size: "small",
    },
  ] satisfies ProofWork[],
};

export const theQuestion = {
  headline: "How much can one person make now?",
  supporting: "That question has been keeping me busy.",
};

export type ProcessStep = {
  index: string;
  label: string;
  description: string;
  image?: string;
};

const insideTheStudioSteps: ProcessStep[] = [
  {
    index: "01",
    label: "Reference",
    description: "A visual direction gathered before a line of code existed.",
  },
  {
    index: "02",
    label: "First attempt",
    description: "A working build, generated fast, technically correct.",
  },
  {
    index: "03",
    label: "Emma's decision",
    description: "Kept the bones. Rejected the feeling. Sent it back.",
  },
  {
    index: "04",
    label: "Revised result",
    description: "The version you're looking at right now.",
  },
];

export const insideTheStudio = {
  label: "INSIDE THE STUDIO",
  caseStudy: "Case study — Building this website",
  steps: insideTheStudioSteps,
  pullQuote: "The first version was technically fine. It just didn't feel like me.",
};

export type House = {
  name: string;
  descriptor: string;
  href: string;
  size: "xl" | "l" | "m" | "s";
  image?: string;
};

const theHouseWorlds: House[] = [
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

export const theHouse = {
  label: "THE HOUSE",
  worlds: theHouseWorlds,
};

export type FeaturedFilm = {
  title: string;
  description: string;
  href: string;
  thumbnail: string | null;
};

export const watchMeBuild = {
  label: "WATCH ME BUILD",
  supporting: "The latest film from inside the studio.",
  film: {
    title: "Coming soon from inside the studio",
    description: "The first film hasn't been cut yet. It will premiere here first.",
    href: "#",
    thumbnail: null,
  } satisfies FeaturedFilm,
};

export type StudioNotePreview = {
  title: string;
  status: string;
};

export const studioNotes = {
  label: "STUDIO NOTES",
  supporting: "Emma's weekly creative archive — starting soon.",
  posts: [
    { title: "Why I Put a Surfer on My Homepage", status: "COMING TO STUDIO NOTES" },
    { title: "I Rejected the First Version", status: "COMING TO STUDIO NOTES" },
    { title: "What I'm Learning About Working With AI", status: "COMING TO STUDIO NOTES" },
  ] satisfies StudioNotePreview[],
};

export const currentlyMaking = {
  label: "CURRENTLY MAKING",
  lines: ["This website.", "A music video.", "The next Sly Fairy scene."],
};

export const emma = {
  primaryImage: "/archive/emma/studio-candid.jpg",
  primaryAlt: "Emma Kwon in the studio",
  secondaryImage: "/archive/emma/portrait.jpg",
  secondaryAlt: "Emma Kwon portrait",
  lines: [
    "I got on the AI wave at 50.",
    "I'm 52 now.",
    "Mostly, I'm still curious what an idea can become when I don't have to stop at what I already know how to do.",
  ],
};

export type DoorPath = {
  label: string;
  href: string;
};

export const finalDoor = {
  headline: "Where would you like to go next?",
  paths: [
    { label: "EXPLORE THE WORK", href: "#the-house" },
    { label: "ENTER THE STUDIO", href: "#inside-the-studio" },
    { label: "READ THE NOTES", href: "#studio-notes" },
  ] satisfies DoorPath[],
  contact: { label: "Contact", href: "#" } satisfies DoorPath,
};
