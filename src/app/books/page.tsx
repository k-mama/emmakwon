import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  bookMusic,
  bookStory,
  booksEnding,
  booksHero,
  bornRare,
} from "@/content/books";
import styles from "./page.module.css";

const booksHeroBackground = [
  "radial-gradient(54% 66% at 90% 12%, rgba(196, 164, 118, 0.3) 0%, rgba(196, 164, 118, 0) 72%)",
  "radial-gradient(48% 58% at 8% 88%, rgba(194, 155, 143, 0.18) 0%, rgba(194, 155, 143, 0) 74%)",
  "linear-gradient(145deg, #faf7f1 0%, #efe9e1 52%, #f1e8e3 100%)",
].join(", ");

export const metadata = {
  title: "Books — Emma Kwon",
  description:
    "Books and publishing by Emma Kwon, led by the memoir BORN RARE and its connected music world.",
};

export default function BooksPage() {
  return (
    <>
      <Header />
      <main>
        <section id="hero" className={styles.hero} aria-labelledby="books-heading">
          <div className={styles.heroStage} style={{ background: booksHeroBackground }}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>{booksHero.eyebrow}</p>
              <h1 id="books-heading" className={styles.heroTitle}>
                {booksHero.title}
              </h1>
              <p className={styles.heroTagline}>{booksHero.tagline}</p>
              <p className={styles.heroSupporting}>{booksHero.supporting}</p>
            </div>
            <figure className={styles.heroBook}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={booksHero.image}
                alt={booksHero.imageAlt}
                className={styles.heroBookImage}
              />
            </figure>
          </div>
        </section>

        <section id="born-rare" className={styles.bornRare} aria-labelledby="born-rare-heading">
          <div className="container">
            <div className={styles.editorialGrid}>
              <p className={styles.eyebrow}>{bornRare.eyebrow}</p>
              <div>
                <h2 id="born-rare-heading" className={styles.sectionTitle}>
                  {bornRare.title}
                </h2>
                <p className={styles.sectionBody}>{bornRare.body}</p>
                <a
                  href={bornRare.cta.href}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.textLink}
                >
                  {bornRare.cta.label} <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="story" className={styles.story} aria-labelledby="story-heading">
          <div className="container">
            <div className={styles.editorialGrid}>
              <p className={styles.eyebrow}>{bookStory.eyebrow}</p>
              <div>
                <h2 id="story-heading" className={styles.editorialTitle}>
                  {bookStory.title}
                </h2>
                <p className={styles.editorialBody}>{bookStory.body}</p>
              </div>
            </div>
          </div>
        </section>

        <section id="music-ost" className={styles.music} aria-labelledby="music-heading">
          <div className="container">
            <div className={styles.musicStage}>
              <figure className={styles.musicCoverFrame}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={bookMusic.image}
                  alt={bookMusic.imageAlt}
                  className={styles.musicCover}
                  loading="lazy"
                  decoding="async"
                />
              </figure>
              <div className={styles.musicCopy}>
                <p className={styles.eyebrow}>{bookMusic.eyebrow}</p>
                <h2 id="music-heading" className={styles.musicTitle}>
                  {bookMusic.title}
                </h2>
                <p className={styles.musicBody}>{bookMusic.body}</p>
                <Link href={bookMusic.cta.href} className={styles.textLink}>
                  {bookMusic.cta.label} <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.ending}>
          <div className="container">
            <h2 className={styles.endingHeadline}>{booksEnding.headline}</h2>
            <Link href={booksEnding.cta.href} className={styles.endingLink}>
              {booksEnding.cta.label} <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
