import type { MetadataRoute } from "next";
import { getPublishedPosts } from "@/content/studio";

const SITE_URL = "https://emmakwon.pages.dev";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "",
    "/sly-fairy",
    "/emmaestro",
    "/k-mama",
    "/books",
    "/studio",
    "/studio/notes",
  ].map((path) => ({
    url: `${SITE_URL}${path}/`,
  }));

  const noteRoutes = getPublishedPosts().map((post) => ({
    url: `${SITE_URL}/studio/notes/${post.slug}/`,
    lastModified: post.updatedAt || post.publishedAt || post.createdAt,
  }));

  return [...staticRoutes, ...noteRoutes];
}
