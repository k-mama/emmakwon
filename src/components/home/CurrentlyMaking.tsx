import { currentlyMaking } from "@/content/home";
import styles from "./CurrentlyMaking.module.css";

const dotClass = [styles.dotOne, styles.dotTwo, styles.dotThree];

export default function CurrentlyMaking() {
  return (
    <section className={styles.section} aria-labelledby="currently-making-heading">
      <div className="container">
        <div className={styles.inner}>
          <p id="currently-making-heading" className={styles.label}>
            {currentlyMaking.label}
          </p>
          <ul className={styles.lines}>
            {currentlyMaking.lines.map((line, i) => (
              <li key={line} className={styles.line}>
                <span className={`${styles.dot} ${dotClass[i % dotClass.length]}`} aria-hidden="true" />
                {line}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
