// Site-wide primary navigation. Separate from homepage section content
// (src/content/home.ts) since the header renders on every page.
//
// Direct-access navigation: each major creative identity is a real
// top-level destination, with a lightweight dropdown (hover/focus) for its
// own sub-pages. None of those sub-pages exist yet, so their links stay as
// placeholder hrefs until those internal routes exist. STUDIO / EMMA anchor
// to the matching section on this homepage; CONTACT has no destination yet.
//
// Note: "Sly Fairy — Album" (an EMMAESTRO release) is distinct from the
// top-level "SLY FAIRY" item (the character/narrative IP that grew out of
// it) — kept as two separate entries so the brand distinction stays visible.

export type NavLink = {
  label: string;
  href: string;
};

export type NavItem = {
  label: string;
  href: string;
  links?: NavLink[];
};

export const primaryNav: NavItem[] = [
  {
    label: "EMMAESTRO",
    href: "#",
    links: [
      { label: "Aussie", href: "#" },
      { label: "Sly Fairy — Album", href: "#" },
      { label: "No Deadline To Be Okay", href: "#" },
      { label: "Music Videos", href: "#" },
    ],
  },
  {
    label: "BOOKS",
    href: "#",
    links: [
      { label: "BORN RARE", href: "#" },
      { label: "Amazing Tiger Publishing", href: "#" },
    ],
  },
  {
    label: "K-MAMA",
    href: "#",
    links: [
      { label: "Coloring Books", href: "#" },
      { label: "Kids Songs", href: "#" },
    ],
  },
  {
    label: "SLY FAIRY",
    href: "#",
    links: [
      { label: "Character & World", href: "#" },
      { label: "Stories", href: "#" },
      { label: "Films", href: "#" },
    ],
  },
  {
    label: "STUDIO",
    href: "#studio",
    links: [
      { label: "Watch Me Build", href: "#" },
      { label: "Studio Notes", href: "#" },
      { label: "AI Process", href: "#" },
    ],
  },
  { label: "EMMA", href: "#emma" },
  { label: "CONTACT", href: "#" },
];
