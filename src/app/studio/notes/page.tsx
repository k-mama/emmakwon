import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import NoteList from "@/components/studio/NoteList";
import { getPublishedPosts } from "@/content/studio";
import styles from "./page.module.css";

export const metadata = {
  title: "Studio Notes — Emma Kwon",
  description: "How Emma actually makes things with AI — real projects, real prompts, what worked and what didn't.",
};

export default function StudioNotesPage() {
  const posts = getPublishedPosts();

  return (
    <>
      <Header opaque />
      <main>
        <section className={styles.header}>
          <div className="container">
            <p className={styles.eyebrow}>
              <Link href="/studio/" className={styles.backLink}>
                STUDIO
              </Link>
            </p>
            <h1 className={styles.headline}>Studio Notes</h1>
            <p className={styles.supporting}>How I actually make things with AI — real projects, what worked and what didn&rsquo;t.</p>
          </div>
        </section>

        <section className={styles.list}>
          <div className="container">
            <NoteList posts={posts} />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
