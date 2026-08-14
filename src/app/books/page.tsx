import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  bookMusic,
  bookStory,
  booksEnding,
  booksHero,
  bornRare,
  rightsPress,
} from "@/content/books";
import styles from "./page.module.css";

export const metadata = {
  title: "Books — Emma Kwon",
  description:
    "Books and publishing by Emma Kwon, led by the memoir BORN RARE and its connected music and publishing world.",
};

export default function BooksPage() {
  return (
    <>
      <Header />
      <main>
        <section id="hero" className={styles.hero} aria-labelledby="books-heading">
          <div className={styles.heroStage}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>{booksHero.eyebrow}</p>
              <h1 id="books-heading" className={styles.heroTitle}>
                {booksHero.title}
              </h1>
              <p className={styles.heroTagline}>{booksHero.tagline}</p>
              <p className={styles.heroSupporting}>{booksHero.supporting}</p>
            </div>
            <div className={styles.heroBook} aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={booksHero.image} alt="" className={styles.heroBookImage} />
            </div>
          </div>
        </section>

        <section id="born-rare" className={styles.bornRare} aria-labelledby="born-rare-heading">
          <div className="container">
            <div className={styles.bookGrid}>
              <div className={styles.bookFrame}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={bornRare.image}
                  alt={bornRare.imageAlt}
                  className={styles.bookCover}
                  loading="lazy"
                />
              </div>
              <div className={styles.bookCopy}>
                <p className={styles.eyebrow}>{bornRare.eyebrow}</p>
                <h2 id="born-rare-heading" className={styles.sectionTitle}>
                  {bornRare.title}
                </h2>
                <p className={styles.sectionBody}>{bornRare.body}</p>
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
              <div className={styles.musicCoverFrame}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={bookMusic.image}
                  alt={bookMusic.imageAlt}
                  className={styles.musicCover}
                  loading="lazy"
                />
              </div>
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

        <section id="rights-press" className={styles.rights} aria-labelledby="rights-heading">
          <div className="container">
            <div className={styles.rightsIntro}>
              <p className={styles.eyebrow}>{rightsPress.eyebrow}</p>
              <h2 id="rights-heading" className={styles.rightsTitle}>
                {rightsPress.title}
              </h2>
              <p className={styles.rightsBody}>{rightsPress.body}</p>
            </div>

            <div className={styles.rightsList}>
              {rightsPress.items.map((item, index) => (
                <div key={item.label} className={styles.rightsRow}>
                  <span className={styles.rowNumber}>{String(index + 1).padStart(2, "0")}</span>
                  <h3 className={styles.rowLabel}>{item.label}</h3>
                  <p className={styles.rowText}>{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.ending}>
          <div className="container">
            <h2 className={styles.endingHeadline}>{booksEnding.headline}</h2>
            <Link href={booksEnding.cta.href} className={styles.endingLink}>
              <span aria-hidden="true">←</span> {booksEnding.cta.label}
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
