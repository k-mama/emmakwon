import { studioNotes } from "@/content/home";
import styles from "./StudioNotes.module.css";

export default function StudioNotes() {
  return (
    <section id="studio-notes" className={styles.section} aria-labelledby="notes-heading">
      <div className="container">
        <p className={styles.eyebrow}>{studioNotes.label}</p>
        <h2 id="notes-heading" className={styles.heading}>
          {studioNotes.supporting}
        </h2>

        <ol className={styles.posts}>
          {studioNotes.posts.map((post, i) => (
            <li key={post.title} className={`${styles.post} ${i === 0 ? styles.lead : ""}`}>
              <span className={styles.index}>{String(i + 1).padStart(2, "0")}</span>
              <span className={styles.postBody}>
                <span className={styles.postTitle}>{post.title}</span>
                <span className={styles.status}>{post.status}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
