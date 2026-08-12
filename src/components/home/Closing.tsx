import { closing } from "@/content/home";
import styles from "./Closing.module.css";

export default function Closing() {
  return (
    <section id="contact" className={styles.section} aria-labelledby="closing-heading">
      <div className="container">
        <div className={styles.inner}>
          <h2 id="closing-heading" className={styles.headline}>
            {closing.headline}
          </h2>

          <nav className={styles.paths} aria-label="Where to go next">
            {closing.paths.map((path) => (
              <a key={path.label} href={path.href} className={styles.path}>
                {path.label}
              </a>
            ))}
          </nav>

          <a href={closing.contact.href} className={styles.contact}>
            {closing.contact.label}
          </a>
        </div>
      </div>
    </section>
  );
}
