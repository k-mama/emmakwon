import { curatedWorlds } from "@/content/home";
import styles from "./CuratedWorlds.module.css";

const sizeClass: Record<string, string> = {
  large: styles.large,
  medium: styles.medium,
};

export default function CuratedWorlds() {
  return (
    <section id="house" className={styles.section} aria-labelledby="house-heading">
      <div className="container">
        <p className={styles.eyebrow}>{curatedWorlds.eyebrow}</p>
        <h2 id="house-heading" className={styles.headline}>
          {curatedWorlds.headline}
        </h2>

        <div className={styles.rooms}>
          {curatedWorlds.worlds.map((world) => (
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
