import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  kMamaEnding,
  kMamaHero,
  kMamaLife,
  kMamaMusic,
  kMamaPrinciples,
  kMamaWorld,
} from "@/content/k-mama";
import styles from "./page.module.css";
import paletteStyles from "@/styles/RoomPalettes.module.css";
import rhythmStyles from "@/styles/EditorialRhythm.module.css";

export const metadata = {
  title: "K-MAMA English — Emma Kwon",
  description:
    "K-MAMA English follows Emma Kwon learning English in Brisbane and turning the grammar, expressions, and real-life moments that finally click into clear Korean explanations.",
};

export default function KMamaPage() {
  return (
    <>
      <Header />
      <main>
        <section id="hero" className={styles.hero} aria-labelledby="k-mama-heading">
          <div className={`${styles.heroStage} ${paletteStyles.kMamaHero}`}>
            <p className={styles.eyebrow}>{kMamaHero.eyebrow}</p>
            <h1 id="k-mama-heading" className={styles.heroTitle}>
              {kMamaHero.title}
            </h1>
            <p className={styles.heroTagline}>{kMamaHero.tagline}</p>
            <p className={`${styles.heroSupporting} ${rhythmStyles.heroSupport}`}>
              {kMamaHero.supporting}
            </p>
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

            <div className={styles.principles} aria-label="K-MAMA English learning principles">
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

        <section
          id="music"
          className={`${styles.music} ${rhythmStyles.fullBleedSection}`}
          aria-labelledby="music-heading"
        >
          <div className="container">
            <div
              className={`${styles.musicStage} ${paletteStyles.kMamaMusic} ${rhythmStyles.fullBleedStage}`}
            >
              <p className={styles.eyebrow}>{kMamaMusic.eyebrow}</p>
              <h2 id="music-heading" className={styles.musicTitle}>
                {kMamaMusic.headline}
              </h2>
              <p className={styles.musicBody}>{kMamaMusic.body}</p>
              <a
                href={kMamaMusic.cta.href}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.musicLink}
              >
                {kMamaMusic.cta.label} <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </section>

        <section id="life" className={styles.stories} aria-labelledby="life-heading">
          <div className="container">
            <div className={styles.introGrid}>
              <p className={styles.eyebrow}>{kMamaLife.eyebrow}</p>
              <div className={styles.storyCopy}>
                <h2 id="life-heading" className={styles.sectionTitle}>
                  {kMamaLife.headline}
                </h2>
                <p className={styles.sectionBody}>{kMamaLife.body}</p>
              </div>
            </div>
          </div>
        </section>

        <section className={`${styles.ending} ${rhythmStyles.ending}`}>
          <div className="container">
            <h2 className={styles.endingHeadline}>{kMamaEnding.headline}</h2>
            <a
              href={kMamaEnding.cta.href}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.endingLink}
            >
              {kMamaEnding.cta.label} <span aria-hidden="true">→</span>
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
