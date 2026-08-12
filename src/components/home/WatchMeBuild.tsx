import { watchMeBuild } from "@/content/home";
import styles from "./WatchMeBuild.module.css";

export default function WatchMeBuild() {
  const { film } = watchMeBuild;

  return (
    <section className={styles.section} aria-labelledby="watch-heading">
      <div className="container">
        <p className={styles.eyebrow}>{watchMeBuild.label}</p>
        <h2 id="watch-heading" className={styles.heading}>
          {watchMeBuild.supporting}
        </h2>

        <a href={film.href} className={styles.frame} aria-label={film.title}>
          {film.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={film.thumbnail} alt="" className={styles.thumbnail} loading="lazy" />
          ) : null}

          <span className={styles.overlay}>
            <span className={styles.playRing} aria-hidden="true">
              <svg width="18" height="20" viewBox="0 0 18 20" fill="none">
                <path d="M1 1.2C1 0.4 1.9 -0.1 2.6 0.3L17 9.1C17.6 9.5 17.6 10.5 17 10.9L2.6 19.7C1.9 20.1 1 19.6 1 18.8V1.2Z" fill="currentColor" />
              </svg>
            </span>
            <span className={styles.filmTag}>FILM</span>
            <span className={styles.filmTitle}>{film.title}</span>
            <span className={styles.filmDescription}>{film.description}</span>
          </span>
        </a>
      </div>
    </section>
  );
}
