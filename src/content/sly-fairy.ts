// Typed public-facing content for /sly-fairy.
// Keep the website evocative rather than encyclopedic: the audience should
// feel the story engine without being handed the private universe bible.

export const slyFairyHero = {
  eyebrow: "AN ORIGINAL STORY WORLD",
  title: "SLY FAIRY",
  tagline: "Why would anyone choose a life they cannot keep?",
  supporting: "A celestial fixer gets close enough to human life to discover that being right is not the same as having the right to decide.",
};

export const premise = {
  eyebrow: "THE STORY",
  headline: "She was very good at being needed.",
  lines: [
    "For a long time, Sly Fairy knew exactly where she belonged: wherever something needed fixing.",
    "Then Water returned. The work that had defined her was suddenly over.",
    "With no crisis to solve, Sly turns toward the one thing she still cannot make sense of — humans.",
  ],
};

export const storyBeats = [
  {
    number: "01",
    label: "NEEDED",
    body: "She notices what is needed before anyone asks.",
  },
  {
    number: "02",
    label: "UNNEEDED",
    body: "One day, the job that made her indispensable ends.",
  },
  {
    number: "03",
    label: "EARTH",
    body: "She takes a bounded human body and gets close enough to be wrong.",
  },
  {
    number: "04",
    label: "MUSIC",
    body: "She begins making something that can move through the world without her controlling where it goes.",
  },
];

// Deliberate media slots. Waterworks stays atmospheric until a canon-accurate
// archive/hydraulic image exists; approved concept stills are used only where
// they do not imply surveillance or contradict the current world rules.
export const cinematicMedia = {
  waterworks: {
    kind: "atmosphere" as const,
    src: null as string | null,
    poster: null as string | null,
    alt: "",
    tone: "water" as const,
    eyebrow: "THE WATERWORKS",
    title: "What remained was never the whole story.",
    caption: "Fragments travel through Water. Context does not.",
  },
  earth: {
    kind: "image" as const,
    src: "/media/sly-fairy/home-composing.webp",
    poster: null as string | null,
    alt: "Sly Fairy composing music beside a collaborator at sunset",
    tone: "earth" as const,
    eyebrow: "EARTH",
    title: "A borrowed body. A song of her own.",
    caption: "Work leaves her tired. Music gives her something she cannot solve by being useful.",
  },
  music: {
    kind: "image" as const,
    src: "/media/sly-fairy/music-piano.webp",
    poster: null as string | null,
    alt: "Sly Fairy playing piano while a collaborator listens in an intimate music room",
    tone: "earth" as const,
    eyebrow: "MUSIC IN THE WORLD",
    title: "The song leaves the room.",
    caption: "Sly can make it. She cannot decide what it will mean to everyone who hears it.",
  },
  residue: {
    kind: "image" as const,
    src: "/media/sly-fairy/water-residue.webp",
    poster: null as string | null,
    alt: "Sly Fairy reaching toward a luminous stream of water in a twilight room",
    tone: "water" as const,
    eyebrow: "WHAT REMAINED",
    title: "A fragment is not a whole life.",
    caption: "Water can carry a trace. It cannot tell Sly what the person meant.",
  },
};

export const musicConnection = {
  eyebrow: "MUSIC",
  title: "The music came first.",
  body: "Sly Fairy first entered Emma Kwon's creative house through an EMMAESTRO release. The story now grows beyond the record — into rooms, work, mistakes, desire, and the strange freedom of making something you cannot fully control.",
  image: "/archive/emmaestro/sly-fairy-album-cover.jpg",
  imageAlt: "Sly Fairy album cover from the EMMAESTRO catalog",
  cta: { label: "AN EMMAESTRO RELEASE", href: "/emmaestro/#releases" },
};

export const visualWorld = {
  eyebrow: "VISUAL WORLD",
  headline: "Water remembers what remained.",
  body: "Not a recording. Not a window into anyone's life. A wet sleeve. Rain against glass. A laugh near running water. A badly sung note. Sly receives fragments — enough to make her curious, never enough to make her certain.",
};

export const slySceneArchive = {
  eyebrow: "SCENE ARCHIVE",
  title: "Three doors into the world.",
  intro:
    "The archive can grow one scene at a time. A finished still, a film frame, a character study, or a future episode image can replace any slot without changing the room around it.",
  items: [
    {
      label: "EARTH",
      title: "Borrowed life",
      note: "Work, fatigue, desire, and the first pleasure of making something that belongs to her.",
      href: "#earth",
      media: {
        src: "/media/sly-fairy/home-composing.webp",
        alt: "Sly Fairy composing beside a collaborator at sunset",
      },
    },
    {
      label: "MUSIC",
      title: "The song leaves the room",
      note: "The work becomes public. What it means after that is no longer fully hers.",
      href: "#music",
      media: {
        src: "/media/sly-fairy/music-piano.webp",
        alt: "Sly Fairy playing piano in an intimate music room",
      },
    },
    {
      label: "WATER",
      title: "What remained",
      note: "Fragments travel. Context does not. Curiosity begins where certainty ends.",
      href: "#visual-world",
      media: {
        src: "/media/sly-fairy/water-residue.webp",
        alt: "Sly Fairy reaching toward luminous water residue",
      },
    },
  ],
};

export const signatureQuote = {
  quote: "Because I can't tell from here.",
  context: "THE JOB THAT ENDED",
};

export const centralQuestion = {
  eyebrow: "THE QUESTION",
  headline: "Can you touch a life without taking it over?",
  body: "Sly notices what is needed before anyone asks. On Earth, that gift becomes harder to use: a good result does not automatically make the choice hers.",
};

export const worldGrowing = {
  eyebrow: "HUMAN LIFE",
  headline: "A life she cannot solve like a problem.",
  body: "Lowwater. A borrowed body. Work that leaves her tired. Music that refuses to become perfect. People who can be angry and kind in the same hour. The closer Sly gets, the less human life behaves like a problem with one correct answer.",
};

export const endingCta = {
  headline: "THE STORY IS JUST BEGINNING.",
  cta: { label: "Continue to EMMAESTRO", href: "/emmaestro/" },
};