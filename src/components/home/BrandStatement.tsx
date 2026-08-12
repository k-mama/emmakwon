import { brandStatement } from "@/content/home";
import styles from "./BrandStatement.module.css";

export default function BrandStatement() {
  return (
    <section id="emma" className={styles.section} aria-labelledby="emma-heading">
      <div className="container">
        <div className={styles.panel}>
          <div className={styles.copy}>
            <p className={styles.eyebrow}>{brandStatement.eyebrow}</p>
            <h2 id="emma-heading" className={styles.headline}>
              {brandStatement.headline}
            </h2>
            <p className={styles.lede}>{brandStatement.lede}</p>
            {brandStatement.lines.map((line) => (
              <p key={line} className={styles.line}>
                {line}
              </p>
            ))}
          </div>

          <div className={styles.card}>
            <div className={styles.frame}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={brandStatement.image}
                alt={brandStatement.imageAlt}
                width={1122}
                height={1402}
                loading="lazy"
                className={styles.image}
              />
            </div>
            <p className={styles.caption}>Emma Kwon</p>
          </div>
        </div>
      </div>
    </section>
  );
}
