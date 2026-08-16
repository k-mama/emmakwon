import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata = createPageMetadata({
  title: "Studio Notes — Emma Kwon",
  description:
    "Notes from Emma Kwon's working process: learning English, building with AI, and making music, books, characters, and digital projects.",
  path: "/studio/notes/",
  image: "/archive/emma/studio-candid.jpg",
  imageAlt: "Emma Kwon working in the studio.",
});

export default function StudioNotesLayout({ children }: { children: ReactNode }) {
  return children;
}
