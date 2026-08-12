import { theQuestion } from "@/content/home";
import styles from "./TheQuestion.module.css";

export default function TheQuestion() {
  return (
    <section className={styles.section} aria-labelledby="the-question-heading">
      <div className="container">
        <div className={styles.inner}>
          <h2 id="the-question-heading" className={styles.headline}>
            {theQuestion.headline}
          </h2>
          <p className={styles.supporting}>{theQuestion.supporting}</p>
        </div>
      </div>
    </section>
  );
}
