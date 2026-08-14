// Site-wide primary navigation. Separate from homepage section content
// (src/content/home.ts) since the header renders on every page.
//
// The homepage itself is Emma's house — visitors are already inside it on
// arrival, so there is no HOUSE/WORLDS umbrella item. Navigation goes
// straight to Emma Kwon's creative identities, in this intentional order:
// the most distinctive character IP first, then music, children's work,
// books, and finally STUDIO last (what she makes, then how she makes it).
//
// Submenus are intentionally shallow. They define the finished information
// architecture now without forcing us to build a large number of empty
// routes. Existing worlds use real page anchors so submenu clicks already
// land somewhere meaningful.

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
    href: "#",
    children: [
      { label: "THE WORLD", href: "#" },
      { label: "MUSIC", href: "#" },
      { label: "STORIES", href: "#" },
      { label: "CHARACTERS", href: "#" },
    ],
  },
  {
    label: "BOOKS",
    href: "#",
    children: [
      { label: "BORN RARE", href: "#" },
      { label: "THE STORY BEHIND THE BOOK", href: "#" },
      { label: "MUSIC & OST", href: "#" },
      { label: "RIGHTS & PRESS", href: "#" },
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
