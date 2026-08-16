import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata = createPageMetadata({
  title: "EMMAESTRO — Emma Kwon",
  description:
    "EMMAESTRO is the music world of Emma Kwon: releases, cinematic music, classical writing, and the BORN RARE OST.",
  path: "/emmaestro/",
  image: "/archive/emmaestro/sly-fairy-album-cover.jpg",
  imageAlt: "Sly Fairy album cover from the EMMAESTRO catalog.",
});

export default function EmmaestroLayout({ children }: { children: ReactNode }) {
  return children;
}
