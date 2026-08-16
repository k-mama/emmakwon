import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <>
      <Header opaque />
      <main className={styles.main}>
        <section className={styles.room} aria-labelledby="not-found-heading">
          <div className="container">
            <p className={styles.eyebrow}>404 / NOT FOUND</p>
            <h1 id="not-found-heading" className={styles.headline}>
              This room isn&apos;t here.
            </h1>
            <p className={styles.body}>
              The creative house is still open. Return to the main hall and choose another room.
            </p>
            <Link href="/" className={styles.link}>
              RETURN TO THE HOUSE <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
