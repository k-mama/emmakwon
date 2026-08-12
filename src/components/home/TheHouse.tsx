import { theHouse } from "@/content/home";
import styles from "./TheHouse.module.css";

const sizeClass: Record<string, string> = {
  xl: styles.xl,
  l: styles.l,
  m: styles.m,
  s: styles.s,
};

export default function TheHouse() {
  return (
    <section id="the-house" className={styles.section} aria-labelledby="house-heading">
      <div className="container">
        <p className={styles.eyebrow}>{theHouse.label}</p>
        <h2 id="house-heading" className={styles.heading}>
          Five worlds, one studio.
        </h2>

        <div className={styles.rooms}>
          {theHouse.worlds.map((world) => (
            <a
              key={world.name}
              href={world.href}
              className={`${styles.room} ${sizeClass[world.size]} ${world.image ? styles.hasImage : styles.plain}`}
              aria-label={`${world.name} — ${world.descriptor}`}
            >
              {world.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={world.image} alt="" className={styles.roomImage} loading="lazy" />
              )}
              {world.image && <span className={styles.scrim} aria-hidden="true" />}
              <span className={styles.roomContent}>
                <span className={styles.roomName}>{world.name}</span>
                <span className={styles.roomDescriptor}>{world.descriptor}</span>
                <span className={styles.roomExplore}>Explore</span>
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
