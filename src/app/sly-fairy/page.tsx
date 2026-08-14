import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { endingCta, musicConnection, premise, slyFairyHero, worldGrowing } from "@/content/sly-fairy";
import styles from "./page.module.css";

export const metadata = {
  title: "Sly Fairy — Emma Kwon",
  description: "A character born from music — the Sly Fairy world inside Emma Kwon's creative house.",
};

export default function SlyFairyPage() {
  return (
    <>
      <Header opaque />
      <main>
        <section className={styles.hero} aria-labelledby="sly-fairy-heading">
          <div className="container">
            {/* No character artwork exists yet — this is a deliberately
                atmospheric media-ready stage (see .heroStage), built so a
                future video/render can fill it without a redesign. */}
            <div className={styles.heroStage}>
              <p className={styles.heroEyebrow}>{slyFairyHero.eyebrow}</p>
              <h1 id="sly-fairy-heading" className={styles.heroTitle}>
                {slyFairyHero.title}
              </h1>
              <p className={styles.heroTagline}>{slyFairyHero.tagline}</p>
            </div>
          </div>
        </section>

        <section className={styles.premise} aria-labelledby="premise-heading">
          <div className="container">
            <p id="premise-heading" className={styles.eyebrow}>
              {premise.eyebrow}
            </p>
            {premise.lines.map((line) => (
              <p key={line} className={styles.premiseLine}>
                {line}
              </p>
            ))}
          </div>
        </section>

        <section className={styles.music} aria-labelledby="music-heading">
          <div className="container">
            <div className={styles.musicGrid}>
              <div className={styles.musicCard}>
                <div className={styles.musicFrame}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={musicConnection.image}
                    alt={musicConnection.imageAlt}
                    className={styles.musicImage}
                    loading="lazy"
                  />
                </div>
                <p className={styles.musicCaption}>{musicConnection.eyebrow}</p>
              </div>

              <div className={styles.musicCopy}>
                <h2 id="music-heading" className={styles.musicTitle}>
                  {musicConnection.title}
                </h2>
                <p className={styles.musicBody}>{musicConnection.body}</p>
                <a href={musicConnection.cta.href} className={styles.musicCtaLink}>
                  {musicConnection.cta.label} <span aria-hidden="true">→</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.growing} aria-labelledby="growing-heading">
          <div className="container">
            <p className={styles.eyebrow}>{worldGrowing.eyebrow}</p>
            <h2 id="growing-heading" className={styles.growingHeadline}>
              {worldGrowing.headline}
            </h2>
            <p className={styles.growingBody}>{worldGrowing.body}</p>
          </div>
        </section>

        <section className={styles.ending}>
          <div className="container">
            <h2 className={styles.endingHeadline}>{endingCta.headline}</h2>
            <Link href={endingCta.cta.href} className={styles.endingLink}>
              <span aria-hidden="true">←</span> {endingCta.cta.label}
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
