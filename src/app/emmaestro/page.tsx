import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ShowroomMediaBay from "@/components/showroom/ShowroomMediaBay";
import {
  bornRareOst,
  classical,
  emmaestroEnding,
  emmaestroHero,
  movingImage,
  releases,
} from "@/content/emmaestro";
import styles from "./page.module.css";

export const metadata = {
  title: "EMMAESTRO — Emma Kwon",
  description:
    "EMMAESTRO is the music world of Emma Kwon: releases, cinematic music, classical writing, and the BORN RARE OST.",
};

export default function EmmaestroPage() {
  return (
    <>
      <Header />
      <main>
        <section id="hero" className={styles.hero} aria-labelledby="emmaestro-heading">
          <div className={styles.heroStage}>
            <p className={styles.eyebrow}>{emmaestroHero.eyebrow}</p>
            <h1 id="emmaestro-heading" className={styles.heroTitle}>
              {emmaestroHero.title}
            </h1>
            <p className={styles.heroTagline}>{emmaestroHero.tagline}</p>
            <p className={styles.heroSupporting}>{emmaestroHero.supporting}</p>
          </div>
        </section>

        <section id="releases" className={styles.releases} aria-labelledby="releases-heading">
          <div className="container">
            <div className={styles.sectionIntro}>
              <p className={styles.eyebrow}>RELEASES</p>
              <h2 id="releases-heading" className={styles.sectionTitle}>
                Three records. Three different rooms.
              </h2>
            </div>

            <div className={styles.releaseGrid}>
              {releases.map((release) => (
                <article key={release.title} className={styles.releaseCard}>
                  <div className={styles.coverFrame}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={release.image}
                      alt={release.imageAlt}
                      className={styles.coverImage}
                      loading="lazy"
                    />
                  </div>
                  <p className={styles.releaseKind}>{release.kind}</p>
                  <h3 className={styles.releaseTitle}>{release.title}</h3>
                  <p className={styles.releaseNote}>{release.note}</p>
                  {release.cta ? (
                    <Link href={release.cta.href} className={styles.releaseLink}>
                      {release.cta.label} <span aria-hidden="true">→</span>
                    </Link>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="music-videos" className={styles.editorialBand} aria-labelledby="videos-heading">
          <div className="container">
            <div id="videos-heading">
              <ShowroomMediaBay
                eyebrow={movingImage.eyebrow}
                title={movingImage.headline}
                body={movingImage.body}
                roomLabel="MOTION / FILM ROOM"
                tone="violet"
              />
            </div>
          </div>
        </section>

        <section id="classical" className={styles.classical} aria-labelledby="classical-heading">
          <div className="container">
            <div className={styles.classicalStage}>
              <p className={styles.eyebrow}>{classical.eyebrow}</p>
              <h2 id="classical-heading" className={styles.classicalTitle}>
                {classical.headline}
              </h2>
              <p className={styles.classicalBody}>{classical.body}</p>
            </div>
          </div>
        </section>

        <section id="born-rare-ost" className={styles.ost} aria-labelledby="ost-heading">
          <div className="container">
            <div className={styles.ostGrid}>
              <div className={styles.ostCover}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/archive/emmaestro/no-deadline-album-cover.jpg"
                  alt="No Deadline To Be OK album cover by EMMAESTRO"
                  className={styles.coverImage}
                  loading="lazy"
                />
              </div>
              <div>
                <p className={styles.eyebrow}>{bornRareOst.eyebrow}</p>
                <h2 id="ost-heading" className={styles.ostTitle}>
                  {bornRareOst.headline}
                </h2>
                <p className={styles.ostBody}>{bornRareOst.body}</p>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.ending}>
          <div className="container">
            <h2 className={styles.endingHeadline}>{emmaestroEnding.headline}</h2>
            <Link href={emmaestroEnding.cta.href} className={styles.endingLink}>
              {emmaestroEnding.cta.label} <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
