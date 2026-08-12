import { emma } from "@/content/home";
import styles from "./Emma.module.css";

export default function Emma() {
  const [lineOne, lineTwo, ...rest] = emma.lines;

  return (
    <section className={styles.section} aria-labelledby="emma-heading">
      <div className="container">
        <div className={styles.grid}>
          <div className={styles.frame}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={emma.primaryImage}
              alt={emma.primaryAlt}
              width={1000}
              height={1251}
              loading="lazy"
              className={styles.image}
            />
          </div>

          <div className={styles.copy}>
            <h2 id="emma-heading" className={styles.statement}>
              {lineOne}
              <br />
              {lineTwo}
            </h2>
            {rest.map((line) => (
              <p key={line} className={styles.body}>
                {line}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
