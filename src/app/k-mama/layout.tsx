import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata = createPageMetadata({
  title: "K-MAMA — Emma Kwon",
  description:
    "K-MAMA is Emma Kwon's children's creative world for music, stories, characters, and playful imagination.",
  path: "/k-mama/",
  image: "/archive/k-mama/coloring-book-en.jpg",
  imageAlt: "English K-MAMA coloring book cover.",
});

export default function KMamaLayout({ children }: { children: ReactNode }) {
  return children;
}
