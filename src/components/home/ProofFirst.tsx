import { proofFirst } from "@/content/home";
import styles from "./ProofFirst.module.css";

const intrinsicSize: Record<string, { width: number; height: number }> = {
  "Born Rare": { width: 311, height: 466 },
  "Sly Fairy": { width: 1200, height: 1200 },
  "K-Mama Coloring Book": { width: 298, height: 385 },
};

export default function ProofFirst() {
  return (
    <section className={styles.section} aria-labelledby="proof-first-heading">
      <div className="container">
        <p className={styles.eyebrow}>{proofFirst.eyebrow}</p>
        <h2 id="proof-first-heading" className={styles.statement}>
          {proofFirst.statement}
        </h2>

        <ul className={styles.works}>
          {proofFirst.works.map((work) => (
            <li key={work.title} className={`${styles.work} ${styles[work.size]}`}>
              <div className={styles.frame}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={work.image}
                  alt={work.alt}
                  width={intrinsicSize[work.title].width}
                  height={intrinsicSize[work.title].height}
                  loading="lazy"
                  className={styles.image}
                />
              </div>
              <p className={styles.caption}>
                <span className={styles.category}>{work.category}</span>
                <span className={styles.title}>{work.title}</span>
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
