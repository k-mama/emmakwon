// Site-wide primary navigation. Separate from homepage section content
// (src/content/home.ts) since the header renders on every page.
//
// HOUSE is the umbrella entrance to Emma Kwon's creative worlds, organized
// as rooms (EMMAESTRO, K-MAMA, BOOKS & PUBLISHING, SLY FAIRY WORLD) rather
// than a flat list of sibling links. None of the room links have dedicated
// pages yet, so they stay as placeholder hrefs until those internal routes
// exist. STUDIO / NOTES / EMMA anchor to the matching section on this
// homepage; CONTACT has no destination yet.
//
// Note: "Sly Fairy — Album" (an EMMAESTRO release) is distinct from
// "SLY FAIRY WORLD" (the character/narrative IP that grew out of it) — kept
// as two separate rooms so the brand distinction stays visible in the menu.

export type NavLink = {
  label: string;
  href: string;
};

export type NavGroup = {
  label: string;
  links: NavLink[];
};

export type NavItem = {
  label: string;
  href: string;
  groups?: NavGroup[];
};

export const houseGroups: NavGroup[] = [
  {
    label: "EMMAESTRO",
    links: [
      { label: "Music", href: "#" },
      { label: "Albums", href: "#" },
      { label: "Sly Fairy — Album", href: "#" },
      { label: "Music Videos", href: "#" },
    ],
  },
  {
    label: "K-MAMA",
    links: [
      { label: "Coloring Books", href: "#" },
      { label: "Kids Songs", href: "#" },
    ],
  },
  {
    label: "BOOKS & PUBLISHING",
    links: [
      { label: "BORN RARE", href: "#" },
      { label: "Amazing Tiger Publishing", href: "#" },
    ],
  },
  {
    label: "SLY FAIRY WORLD",
    links: [
      { label: "Character", href: "#" },
      { label: "Stories", href: "#" },
      { label: "Films", href: "#" },
    ],
  },
];

export const primaryNav: NavItem[] = [
  { label: "HOUSE", href: "#house", groups: houseGroups },
  { label: "STUDIO", href: "#studio" },
  { label: "NOTES", href: "#notes" },
  { label: "EMMA", href: "#emma" },
  { label: "CONTACT", href: "#" },
];
