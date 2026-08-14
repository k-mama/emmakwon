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
// archive/hydraulic image exists; the approved Earth still is already public.
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