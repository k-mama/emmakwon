import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import NoteList from "@/components/studio/NoteList";
import { studioHero, studioPillars, getFeaturedPost, getPostsByCategory, getPublishedPosts } from "@/content/studio";
import styles from "./page.module.css";

export const metadata = {
  title: "Studio — Emma Kwon",
  description: "The room behind the finished work: what Emma is learning, building, and making.",
};

export default function StudioPage() {
  const learnPost = getFeaturedPost("LEARN");
  const buildPosts = getPostsByCategory("BUILD");
  const featuredBuildPost = buildPosts[0];
  const recentBuildPosts = buildPosts.slice(1, 4);
  const makePost = getFeaturedPost("MAKE");
  const latestNotes = getPublishedPosts().slice(0, 4);

  return (
    <>
      <Header opaque />
      <main>
        <section className={styles.hero} aria-labelledby="studio-heading">
          <div className="container">
            <div className={styles.heroPanel}>
              <p className={styles.eyebrow}>{studioHero.eyebrow}</p>
              <h1 id="studio-heading" className={styles.headline}>
                {studioHero.headlineLines.map((line) => (
                  <span key={line} className={styles.headlineLine}>
                    {line}
                  </span>
                ))}
              </h1>
              <p className={styles.supporting}>{studioHero.supporting}</p>
            </div>
          </div>
        </section>

        <section className={styles.pillar} aria-labelledby="learn-heading">
          <div className="container">
            <div className={styles.pillarGrid}>
              <div className={styles.pillarMeta}>
                <p className={styles.pillarNumber}>{studioPillars.learn.number}</p>
                <h2 id="learn-heading" className={styles.pillarLabel}>
                  {studioPillars.learn.label}
                </h2>
              </div>
              <div className={styles.pillarContent}>
                <p className={styles.pillarHeadline}>{studioPillars.learn.headline}</p>
                <p className={styles.pillarDescriptor}>{studioPillars.learn.descriptor}</p>
                {learnPost && (
                  <Link href={`/studio/notes/${learnPost.slug}/`} className={styles.featuredLink}>
                    <span className={styles.featuredTitle}>{learnPost.title}</span>
                    <span className={styles.featuredExcerpt}>{learnPost.excerpt}</span>
                  </Link>
                )}
                <a className={styles.pillarCta} href={studioPillars.learn.cta.href}>
                  {studioPillars.learn.cta.label} <span aria-hidden="true">→</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.pillar} aria-labelledby="build-heading">
          <div className="container">
            <div className={styles.pillarGrid}>
              <div className={styles.pillarMeta}>
                <p className={styles.pillarNumber}>{studioPillars.build.number}</p>
                <h2 id="build-heading" className={styles.pillarLabel}>
                  {studioPillars.build.label}
                </h2>
              </div>
              <div className={styles.pillarContent}>
                <p className={styles.pillarHeadline}>{studioPillars.build.headline}</p>
                <p className={styles.pillarDescriptor}>{studioPillars.build.descriptor}</p>
                {featuredBuildPost && (
                  <Link href={`/studio/notes/${featuredBuildPost.slug}/`} className={styles.featuredLink}>
                    <span className={styles.featuredTitle}>{featuredBuildPost.title}</span>
                    <span className={styles.featuredExcerpt}>{featuredBuildPost.excerpt}</span>
                  </Link>
                )}
                {recentBuildPosts.length > 0 && (
                  <ul className={styles.recentList}>
                    {recentBuildPosts.map((post) => (
                      <li key={post.slug}>
                        <Link href={`/studio/notes/${post.slug}/`} className={styles.recentLink}>
                          {post.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <a className={styles.pillarCta} href={studioPillars.build.cta.href}>
                  {studioPillars.build.cta.label} <span aria-hidden="true">→</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.pillar} aria-labelledby="make-heading">
          <div className="container">
            <div className={styles.pillarGrid}>
              <div className={styles.pillarMeta}>
                <p className={styles.pillarNumber}>{studioPillars.make.number}</p>
                <h2 id="make-heading" className={styles.pillarLabel}>
                  {studioPillars.make.label}
                </h2>
              </div>
              <div className={styles.pillarContent}>
                <p className={styles.pillarHeadline}>{studioPillars.make.headline}</p>
                <p className={styles.pillarDescriptor}>{studioPillars.make.descriptor}</p>
                {makePost && (
                  <Link href={`/studio/notes/${makePost.slug}/`} className={styles.featuredLink}>
                    <span className={styles.featuredTitle}>{makePost.title}</span>
                    <span className={styles.featuredExcerpt}>{makePost.excerpt}</span>
                  </Link>
                )}
                <a className={styles.pillarCta} href={studioPillars.make.cta.href}>
                  {studioPillars.make.cta.label} <span aria-hidden="true">→</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.notes} aria-labelledby="notes-heading">
          <div className="container">
            <div className={styles.notesHeader}>
              <h2 id="notes-heading" className={styles.notesHeading}>
                Studio Notes
              </h2>
              <Link href="/studio/notes/" className={styles.viewAll}>
                VIEW ALL <span aria-hidden="true">→</span>
              </Link>
            </div>
            <NoteList posts={latestNotes} />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
