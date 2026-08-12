// Site-wide primary navigation. Separate from homepage section content
// (src/content/home.ts) since the header renders on every page.
//
// WORLDS is the umbrella entrance to Emma Kwon's creative worlds; its children
// don't have dedicated pages yet, so they stay as placeholder hrefs until
// those internal routes exist. STUDIO / NOTES / EMMA anchor to the matching
// section on this homepage; CONTACT has no destination yet.

export type NavChild = {
  label: string;
  href: string;
};

export type NavItem = {
  label: string;
  href: string;
  children?: NavChild[];
};

export const workChildren: NavChild[] = [
  { label: "EMMAESTRO", href: "#" },
  { label: "BORN RARE", href: "#" },
  { label: "SLY FAIRY", href: "#" },
  { label: "K-MAMA", href: "#" },
  { label: "AMAZING TIGER PUBLISHING", href: "#" },
];

export const primaryNav: NavItem[] = [
  { label: "WORLDS", href: "#worlds", children: workChildren },
  { label: "STUDIO", href: "#studio" },
  { label: "NOTES", href: "#notes" },
  { label: "EMMA", href: "#emma" },
  { label: "CONTACT", href: "#" },
];
