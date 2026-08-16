// Typed content for the HOME page.
// Keep copy and media choices separate from presentation components so
// homepage media can evolve without rebuilding the page structure.

export const houseIndex = {
  eyebrow: "THE CREATIVE HOUSE",
  headline: "Different rooms. One roof.",
  supporting:
    "Music, books, character worlds, and children's work — four public rooms under the same roof.",
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
    { label: "SEE WHAT I'M BUILDING", href: "/studio/#build" },
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
