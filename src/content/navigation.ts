// Site-wide primary navigation. Separate from homepage section content
// (src/content/home.ts) since the header renders on every page.
//
// The homepage itself is Emma's house — visitors are already inside it on
// arrival, so there is no HOUSE/WORLDS umbrella item. Navigation goes
// straight to Emma Kwon's creative identities, in this intentional order:
// the most distinctive character IP first, then music, children's work,
// books, and finally STUDIO last (what she makes, then how she makes it).
//
// Dedicated pages for these identities don't exist yet, so their hrefs stay
// as placeholders until those internal routes are built. STUDIO is the
// exception: it anchors to the matching section on this homepage, which
// already exists. EMMA and CONTACT are intentionally not top-level nav
// items — Emma's story and Contact live inside the homepage itself.
//
// Note: "Sly Fairy — Album" is a release inside EMMAESTRO's music catalog,
// distinct from the top-level "SLY FAIRY" destination (the character/
// narrative IP that grew out of it).

export type NavItem = {
  label: string;
  href: string;
};

export const primaryNav: NavItem[] = [
  { label: "SLY FAIRY", href: "#" },
  { label: "EMMAESTRO", href: "#" },
  { label: "K-MAMA", href: "#" },
  { label: "BOOKS", href: "#" },
  { label: "STUDIO", href: "#studio" },
];
