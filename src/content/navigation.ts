// Site-wide primary navigation. Separate from homepage section content
// (src/content/home.ts) since the header renders on every page.
//
// The homepage itself is Emma's house — visitors are already inside it on
// arrival, so there is no HOUSE/WORLDS umbrella item. Navigation goes
// straight to Emma Kwon's creative identities, in this intentional order:
// the most distinctive character IP first, then music, children's work,
// books, and finally STUDIO last (what she makes, then how she makes it).
//
// Submenus are intentionally shallow. They provide a finished information
// architecture now without forcing us to build a large number of empty
// routes. Brand-world submenu items may point to anchors within the parent
// page until a section becomes substantial enough to deserve its own route.

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
      { label: "MUSIC VIDEOS", href: "/emmaestro/#music-videos" },
      { label: "CLASSICAL", href: "/emmaestro/#classical" },
      { label: "BORN RARE OST", href: "/emmaestro/#born-rare-ost" },
    ],
  },
  {
    label: "K-MAMA",
    href: "/k-mama/",
    children: [
      { label: "THE WORLD", href: "/k-mama/" },
      { label: "MUSIC", href: "/k-mama/#music" },
      { label: "STORIES", href: "/k-mama/#stories" },
      { label: "CHARACTERS", href: "/k-mama/#characters" },
    ],
  },
  {
    label: "BOOKS",
    href: "/books/",
    children: [
      { label: "BORN RARE", href: "/books/#born-rare" },
      { label: "THE STORY BEHIND THE BOOK", href: "/books/#story-behind-the-book" },
      { label: "MUSIC & OST", href: "/books/#music-ost" },
      { label: "RIGHTS & PRESS", href: "/books/#rights-press" },
    ],
  },
  {
    label: "STUDIO",
    href: "/studio/",
    children: [
      { label: "NOTES", href: "/studio/notes/" },
      { label: "LEARN", href: "/studio/notes/?category=LEARN" },
      { label: "BUILD", href: "/studio/notes/?category=BUILD" },
      { label: "MAKE", href: "/studio/notes/?category=MAKE" },
    ],
  },
];
