import { notesTeaser } from "@/content/home";
import styles from "./NotesTeaser.module.css";

export default function NotesTeaser() {
  return (
    <section id="notes" className={styles.section} aria-labelledby="notes-heading">
      <div className="container">
        <div className={styles.inner}>
          <p className={styles.eyebrow}>{notesTeaser.eyebrow}</p>
          <h2 id="notes-heading" className={styles.headline}>
            {notesTeaser.headline}
          </h2>
          <p className={styles.supporting}>{notesTeaser.supporting}</p>
          <span className={styles.status}>{notesTeaser.status}</span>
        </div>
      </div>
    </section>
  );
}
