import { finalDoor } from "@/content/home";
import styles from "./FinalDoor.module.css";

export default function FinalDoor() {
  return (
    <section className={styles.section} aria-labelledby="final-door-heading">
      <div className="container">
        <div className={styles.inner}>
          <h2 id="final-door-heading" className={styles.headline}>
            {finalDoor.headline}
          </h2>

          <nav className={styles.paths} aria-label="Where to go next">
            {finalDoor.paths.map((path) => (
              <a key={path.label} href={path.href} className={styles.path}>
                {path.label}
              </a>
            ))}
          </nav>

          <a href={finalDoor.contact.href} className={styles.contact}>
            {finalDoor.contact.label}
          </a>
        </div>
      </div>
    </section>
  );
}
