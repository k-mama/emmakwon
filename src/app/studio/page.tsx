import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import NoteList from "@/components/studio/NoteList";
import {
  studioHero,
  studioPillars,
  getFeaturedPost,
  getPostsByCategory,
  getPublishedPosts,
} from "@/content/studio";
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
              <div className={styles.heroTopbar}>
                <div className={styles.studioIdentity}>
                  <span className={styles.studioDot} aria-hidden="true" />
                  <span>EMMA KWON STUDIO</span>
                </div>
                <Link href="/studio/notes/" className={styles.topbarLink}>
                  ALL NOTES <span aria-hidden="true">→</span>
                </Link>
              </div>

              <div className={styles.heroGrid}>
                <div className={styles.heroCopy}>
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

                <figure className={styles.heroImageFrame}>
                  <div className={styles.heroImageShell}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/archive/emma/studio-candid.jpg"
                      alt="Emma Kwon working in the studio"
                      className={styles.heroImage}
                    />
                  </div>
                  <figcaption className={styles.heroImageCaption}>IN THE STUDIO</figcaption>
                </figure>
              </div>

              <nav className={styles.quickTabs} aria-label="Browse Studio">
                <a href="#notes" className={`${styles.quickTab} ${styles.quickTabActive}`}>
                  RECENT
                </a>
                <a href="#learn" className={styles.quickTab}>
                  LEARN
                </a>
                <a href="#build" className={styles.quickTab}>
                  BUILD
                </a>
                <a href="#make" className={styles.quickTab}>
                  MAKE
                </a>
              </nav>
            </div>
          </div>
        </section>

        <section id="notes" className={styles.notes} aria-labelledby="notes-heading">
          <div className="container">
            <div className={styles.notesHeader}>
              <div>
                <p className={styles.sectionEyebrow}>LATEST</p>
                <h2 id="notes-heading" className={styles.notesHeading}>
                  Studio Notes
                </h2>
              </div>
              <Link href="/studio/notes/" className={styles.viewAll}>
                VIEW ALL <span aria-hidden="true">→</span>
              </Link>
            </div>
            <NoteList posts={latestNotes} />
          </div>
        </section>

        <section id="learn" className={styles.pillar} aria-labelledby="learn-heading">
          <div className="container">
            <div className={styles.pillarCard}>
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
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="build" className={styles.pillar} aria-labelledby="build-heading">
          <div className="container">
            <div className={styles.pillarCard}>
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
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="make" className={styles.pillar} aria-labelledby="make-heading">
          <div className="container">
            <div className={styles.pillarCard}>
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
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.ending} aria-labelledby="studio-ending-heading">
          <div className="container">
            <p className={styles.endingEyebrow}>OPEN DOOR</p>
            <h2 id="studio-ending-heading" className={styles.endingHeadline}>
              The work keeps moving.
            </h2>
            <Link href="/#contact" className={styles.endingLink}>
              GET IN TOUCH <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
