import Header from "@/components/Header";
import Footer from "@/components/Footer";
import NoteArticle from "@/components/studio/NoteArticle";
import { getPostBySlug, getPublishedPosts } from "@/content/studio";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return getPublishedPosts().map((post) => ({ slug: post.slug }));
}

// Only the posts returned above exist as static files — any other slug 404s
// rather than trying (and failing) to render on demand.
export const dynamicParams = false;

export async function generateMetadata(props: PageProps<"/studio/notes/[slug]">) {
  const { slug } = await props.params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  return {
    title: post.seoTitle ?? `${post.title} — Emma Kwon`,
    description: post.seoDescription ?? post.excerpt,
  };
}

export default async function StudioNotePage(props: PageProps<"/studio/notes/[slug]">) {
  const { slug } = await props.params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <>
      <Header opaque />
      <main>
        <NoteArticle post={post} back={{ href: "/studio/notes/", label: "STUDIO NOTES" }} />
      </main>
      <Footer />
    </>
  );
}
