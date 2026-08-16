import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  kMamaEnding,
  kMamaHero,
  kMamaMusic,
  kMamaPrinciples,
  kMamaStories,
  kMamaWorld,
} from "@/content/k-mama";
import styles from "./page.module.css";

const kMamaHeroBackground = [
  "radial-gradient(54% 62% at 86% 14%, rgba(207, 184, 107, 0.46) 0%, rgba(207, 184, 107, 0) 72%)",
  "radial-gradient(56% 68% at 13% 88%, rgba(196, 146, 160, 0.28) 0%, rgba(196, 146, 160, 0) 74%)",
  "radial-gradient(48% 58% at 96% 92%, rgba(114, 179, 175, 0.3) 0%, rgba(114, 179, 175, 0) 74%)",
  "linear-gradient(145deg, #faf7ef 0%, #f1eaea 44%, #e5efec 100%)",
].join(", ");

const kMamaMusicBackground = [
  "radial-gradient(62% 92% at 4% 18%, rgba(208, 190, 124, 0.38) 0%, rgba(208, 190, 124, 0) 72%)",
  "radial-gradient(58% 82% at 96% 88%, rgba(111, 176, 171, 0.28) 0%, rgba(111, 176, 171, 0) 74%)",
  "linear-gradient(145deg, #f3e8ea 0%, #f1ede3 48%, #e5efeb 100%)",
].join(", ");

export const metadata = {
  title: "K-MAMA — Emma Kwon",
  description:
    "K-MAMA is Emma Kwon's children's creative world for music, stories, characters, and playful imagination.",
};

export default function KMamaPage() {
  return (
    <>
      <Header />
      <main>
        <section id="hero" className={styles.hero} aria-labelledby="k-mama-heading">
          <div className={styles.heroStage} style={{ background: kMamaHeroBackground }}>
            <p className={styles.eyebrow}>{kMamaHero.eyebrow}</p>
            <h1 id="k-mama-heading" className={styles.heroTitle}>
              {kMamaHero.title}
            </h1>
            <p className={styles.heroTagline}>{kMamaHero.tagline}</p>
            <p className={styles.heroSupporting}>{kMamaHero.supporting}</p>
          </div>
        </section>

        <section id="world" className={styles.world} aria-labelledby="world-heading">
          <div className="container">
            <div className={styles.introGrid}>
              <p className={styles.eyebrow}>{kMamaWorld.eyebrow}</p>
              <div>
                <h2 id="world-heading" className={styles.sectionTitle}>
                  {kMamaWorld.headline}
                </h2>
                <p className={styles.sectionBody}>{kMamaWorld.body}</p>
              </div>
            </div>

            <div className={styles.principles} aria-label="K-MAMA creative principles">
              {kMamaPrinciples.map((principle) => (
                <article key={principle.number} className={styles.principle}>
                  <p className={styles.principleNumber}>{principle.number}</p>
                  <p className={styles.principleLabel}>{principle.label}</p>
                  <p className={styles.principleBody}>{principle.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="music" className={styles.music} aria-labelledby="music-heading">
          <div className="container">
            <div className={styles.musicStage} style={{ background: kMamaMusicBackground }}>
              <p className={styles.eyebrow}>{kMamaMusic.eyebrow}</p>
              <h2 id="music-heading" className={styles.musicTitle}>
                {kMamaMusic.headline}
              </h2>
              <p className={styles.musicBody}>{kMamaMusic.body}</p>
              <a
                href={kMamaMusic.cta.href}
                target="_blank"
                rel="noreferrer"
                className={styles.musicLink}
              >
                {kMamaMusic.cta.label} <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </section>

        <section id="stories" className={styles.stories} aria-labelledby="stories-heading">
          <div className="container">
            <div className={styles.storyGrid}>
              <figure className={styles.artifactCard}>
                <div className={styles.artifactFrame}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={kMamaStories.image}
                    alt={kMamaStories.imageAlt}
                    className={styles.artifactImage}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <figcaption className={styles.artifactLabel}>{kMamaStories.artifactLabel}</figcaption>
              </figure>

              <div className={styles.storyCopy}>
                <p className={styles.eyebrow}>{kMamaStories.eyebrow}</p>
                <h2 id="stories-heading" className={styles.sectionTitle}>
                  {kMamaStories.headline}
                </h2>
                <p className={styles.sectionBody}>{kMamaStories.body}</p>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.ending}>
          <div className="container">
            <h2 className={styles.endingHeadline}>{kMamaEnding.headline}</h2>
            <Link href={kMamaEnding.cta.href} className={styles.endingLink}>
              {kMamaEnding.cta.label} <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
