import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata = createPageMetadata({
  title: "K-MAMA English — Emma Kwon",
  description:
    "K-MAMA English follows Emma Kwon learning English in Brisbane and turning the grammar, expressions, and real-life moments that finally click into clear Korean explanations.",
  path: "/k-mama/",
  image: "/archive/emma/studio-candid.jpg",
  imageAlt: "Emma Kwon working in her studio.",
});

export default function KMamaLayout({ children }: { children: ReactNode }) {
  return children;
}
