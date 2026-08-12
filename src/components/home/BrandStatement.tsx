import { brandStatement } from "@/content/home";
import styles from "./BrandStatement.module.css";

export default function BrandStatement() {
  return (
    <section id="about" className={styles.section} aria-labelledby="about-heading">
      <div className="container">
        <div className={styles.grid}>
          <div className={styles.copy}>
            <p className={styles.eyebrow}>{brandStatement.eyebrow}</p>
            <h2 id="about-heading" className={styles.headline}>
              {brandStatement.headline}
            </h2>
            <p className={styles.lede}>{brandStatement.lede}</p>
            {brandStatement.lines.map((line) => (
              <p key={line} className={styles.line}>
                {line}
              </p>
            ))}
          </div>

          <div className={styles.frame}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={brandStatement.image}
              alt={brandStatement.imageAlt}
              width={1000}
              height={1251}
              loading="lazy"
              className={styles.image}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
