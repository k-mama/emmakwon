import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata = createPageMetadata({
  title: "Sly Fairy — Emma Kwon",
  description:
    "Sly Fairy is an original story world by Emma Kwon about usefulness, human choice, music, and a celestial fixer learning that being right is not the same as having the right to decide.",
  path: "/sly-fairy/",
  image: "/media/sly-fairy/home-composing.webp",
  imageAlt: "Sly Fairy composing music beside a companion at sunset.",
});

export default function SlyFairyLayout({ children }: { children: ReactNode }) {
  return children;
}
