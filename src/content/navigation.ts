// Site-wide primary navigation. Separate from homepage section content
// (src/content/home.ts) since the header renders on every page.
//
// The homepage itself is Emma's house — visitors are already inside it on
// arrival, so there is no HOUSE/WORLDS umbrella item. Navigation goes
// straight to Emma Kwon's creative identities, in this intentional order:
// the most distinctive character IP first, then music, children's work,
// books, and finally STUDIO last (what she makes, then how she makes it).
//
// Submenus stay shallow and only point to sections that exist today.

export type NavSubItem = {
  label: string;
  href: string;
};

export type NavItem = {
  label: string;
  href: string;
  children?: NavSubItem[];
};

export const primaryNav: NavItem[] = [
  {
    label: "SLY FAIRY",
    href: "/sly-fairy/",
    children: [
      { label: "ENTER THE WORLD", href: "/sly-fairy/" },
      { label: "THE STORY", href: "/sly-fairy/#story" },
      { label: "MUSIC", href: "/sly-fairy/#music" },
      { label: "VISUAL WORLD", href: "/sly-fairy/#visual-world" },
    ],
  },
  {
    label: "EMMAESTRO",
    href: "/emmaestro/",
    children: [
      { label: "RELEASES", href: "/emmaestro/#releases" },
      { label: "MUSIC FILMS", href: "/emmaestro/#music-videos" },
      { label: "CLASSICAL", href: "/emmaestro/#classical" },
      { label: "BORN RARE OST", href: "/emmaestro/#born-rare-ost" },
    ],
  },
  {
    label: "K-MAMA",
    href: "/k-mama/",
    children: [
      { label: "THE WORLD", href: "/k-mama/#world" },
      { label: "MUSIC & ENGLISH", href: "/k-mama/#music" },
      { label: "STORIES & PLAY", href: "/k-mama/#stories" },
    ],
  },
  {
    label: "BOOKS",
    href: "/books/",
    children: [
      { label: "BORN RARE", href: "/books/#born-rare" },
      { label: "THE STORY BEHIND THE BOOK", href: "/books/#story" },
      { label: "MUSIC & OST", href: "/books/#music-ost" },
    ],
  },
  {
    label: "STUDIO",
    href: "/studio/",
    children: [
      { label: "NOTES", href: "/studio/notes/" },
      { label: "LEARN", href: "/studio/#learn" },
      { label: "BUILD", href: "/studio/#build" },
      { label: "MAKE", href: "/studio/#make" },
    ],
  },
];
