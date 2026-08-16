import type { Metadata } from "next";

type PageMetadataInput = {
  title: string;
  description: string;
  path: string;
  image: string;
  imageAlt: string;
};

export const SITE_NAME = "Emma Kwon";

export function createPageMetadata({
  title,
  description,
  path,
  image,
  imageAlt,
}: PageMetadataInput): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title,
      description,
      url: path,
      siteName: SITE_NAME,
      locale: "en_AU",
      type: "website",
      images: [{ url: image, alt: imageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
