import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata = createPageMetadata({
  title: "Books — Emma Kwon",
  description:
    "Books and publishing by Emma Kwon, led by the memoir BORN RARE and its connected music world.",
  path: "/books/",
  image: "/archive/born-rare/born-rare-book-cover.jpg",
  imageAlt: "BORN RARE book cover by Emma Kwon.",
});

export default function BooksLayout({ children }: { children: ReactNode }) {
  return children;
}
