import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { formatStudioDate, getPostBySlug, getPublishedPosts } from "@/content/studio";
import styles from "./page.module.css";

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
        <article className={styles.article}>
          <div className="container">
            <p className={styles.eyebrow}>
              <Link href="/studio/notes/" className={styles.backLink}>
                STUDIO NOTES
              </Link>
            </p>
            <p className={styles.category}>{post.category}</p>
            <h1 className={styles.headline}>{post.title}</h1>
            <p className={styles.date}>{formatStudioDate(post.publishedAt)}</p>

            {post.coverImage && (
              <div className={styles.coverFrame}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.coverImage} alt="" className={styles.coverImage} />
              </div>
            )}

            <div className={styles.body}>
              {post.body.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>

            {post.tags.length > 0 && (
              <p className={styles.tags}>
                {post.tags.map((tag, index) => (
                  <span key={tag}>
                    {tag}
                    {index < post.tags.length - 1 ? <span aria-hidden="true"> · </span> : null}
                  </span>
                ))}
              </p>
            )}
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
