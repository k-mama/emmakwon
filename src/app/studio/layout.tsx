import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata = createPageMetadata({
  title: "Studio — Emma Kwon",
  description: "The room behind the finished work: what Emma is learning, building, and making.",
  path: "/studio/",
  image: "/archive/emma/studio-candid.jpg",
  imageAlt: "Emma Kwon working in the studio.",
});

export default function StudioLayout({ children }: { children: ReactNode }) {
  return children;
}
