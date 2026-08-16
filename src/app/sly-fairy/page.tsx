import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  centralQuestion,
  cinematicMedia,
  endingCta,
  musicConnection,
  premise,
  signatureQuote,
  slyFairyHero,
  storyBeats,
  visualWorld,
  worldGrowing,
} from "@/content/sly-fairy";
import CinematicStage from "./CinematicStage";
import styles from "./page.module.css";
import questionStyles from "./question.module.css";
import paletteStyles from "@/styles/RoomPalettes.module.css";

export const metadata = {
  title: "Sly Fairy — Emma Kwon",
  description:
    "Sly Fairy is an original story world by Emma Kwon about usefulness, human choice, music, and a celestial fixer learning that being right is not the same as having the right to decide.",
};

export default function SlyFairyPage() {
  return (
    <>
      <Header />
      <main>
        <section id="hero" className={styles.hero} aria-labelledby="sly-fairy-heading">
          <div className={`${styles.heroStage} ${paletteStyles.slyHero}`}>
            <p className={styles.heroEyebrow}>{slyFairyHero.eyebrow}</p>
            <h1 id="sly-fairy-heading" className={styles.heroTitle}>
              {slyFairyHero.title}
            </h1>
            <p className={styles.heroTagline}>{slyFairyHero.tagline}</p>
            <p className={styles.heroSupporting}>{slyFairyHero.supporting}</p>
          </div>
        </section>

        <section id="story" className={styles.premise} aria-labelledby="story-heading">
          <div className="container">
            <div className={styles.storyIntro}>
              <div>
                <p className={styles.eyebrow}>{premise.eyebrow}</p>
                <h2 id="story-heading" className={styles.storyHeadline}>
                  {premise.headline}
                </h2>
              </div>

              <div className={styles.storyCopy}>
                {premise.lines.map((line) => (
                  <p key={line} className={styles.premiseLine}>
                    {line}
                  </p>
                ))}
              </div>
            </div>

            <CinematicStage media={cinematicMedia.waterworks} />

            <div className={styles.storyBeats} aria-label="Sly Fairy story movement">
              {storyBeats.map((beat) => (
                <div key={beat.number} className={styles.storyBeat}>
                  <p className={styles.beatNumber}>{beat.number}</p>
                  <p className={styles.beatLabel}>{beat.label}</p>
                  <p className={styles.beatBody}>{beat.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="earth" aria-label="Sly Fairy on Earth">
          <div className="container">
            <CinematicStage media={cinematicMedia.earth} />
          </div>
        </section>

        <section id="music" className={styles.music} aria-labelledby="music-heading">
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
                    decoding="async"
                  />
                </div>
                <p className={styles.musicCaption}>
                  <Link href={musicConnection.cta.href}>
                    {musicConnection.cta.label} <span aria-hidden="true">→</span>
                  </Link>
                </p>
              </div>

              <div className={styles.musicCopy}>
                <p className={styles.eyebrow}>{musicConnection.eyebrow}</p>
                <h2 id="music-heading" className={styles.musicTitle}>
                  {musicConnection.title}
                </h2>
                <p className={styles.musicBody}>{musicConnection.body}</p>
              </div>
            </div>

            <CinematicStage media={cinematicMedia.music} />
          </div>
        </section>

        <section id="visual-world" className={styles.visual} aria-labelledby="visual-heading">
          <div className="container">
            <div className={styles.visualGrid}>
              <div>
                <p className={styles.eyebrow}>{visualWorld.eyebrow}</p>
                <h2 id="visual-heading" className={styles.visualHeadline}>
                  {visualWorld.headline}
                </h2>
                <p className={styles.visualBody}>{visualWorld.body}</p>
              </div>

              <figure className={styles.quoteBlock}>
                <blockquote className={styles.quote}>{signatureQuote.quote}</blockquote>
                <figcaption className={styles.quoteContext}>{signatureQuote.context}</figcaption>
              </figure>
            </div>

            <CinematicStage media={cinematicMedia.residue} />
          </div>
        </section>

        <section className={questionStyles.question} aria-labelledby="question-heading">
          <div className={`container ${questionStyles.inner}`}>
            <p className={questionStyles.eyebrow}>{centralQuestion.eyebrow}</p>
            <h2 id="question-heading" className={questionStyles.headline}>
              {centralQuestion.headline}
            </h2>
            <p className={questionStyles.body}>{centralQuestion.body}</p>
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
              {endingCta.cta.label} <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
