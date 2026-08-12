import { studioMethod } from "@/content/home";
import styles from "./StudioMethod.module.css";

export default function StudioMethod() {
  return (
    <section id="studio" className={styles.section} aria-labelledby="studio-heading">
      <div className="container">
        <div className={styles.panel}>
          <p className={styles.eyebrow}>{studioMethod.eyebrow}</p>
          <h2 id="studio-heading" className={styles.headline}>
            {studioMethod.headline}
          </h2>
          <p className={styles.body}>{studioMethod.body}</p>
          <p className={styles.pullQuote}>
            <span className={styles.pullQuoteMark} aria-hidden="true" />
            {studioMethod.pullQuote}
          </p>
        </div>
      </div>
    </section>
  );
}
