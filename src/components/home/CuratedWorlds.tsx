import { curatedWorlds } from "@/content/home";
import styles from "./CuratedWorlds.module.css";

// Each room carries its own subtle atmospheric color character (see
// .tone* in CuratedWorlds.module.css) while staying within the same
// restrained cream/ivory card system — assigned by position since the
// four rooms are fixed (Sly Fairy, Emmaestro, K-Mama, Books).
const toneClass = ["toneSlyFairy", "toneEmmaestro", "toneKMama", "toneBooks"] as const;

export default function CuratedWorlds() {
  return (
    <section id="inside-the-house" className={styles.section} aria-labelledby="house-heading">
      <div className="container">
        <p className={styles.eyebrow}>{curatedWorlds.eyebrow}</p>
        <h2 id="house-heading" className={styles.headline}>
          {curatedWorlds.headline}
        </h2>

        <div className={styles.rooms}>
          {curatedWorlds.worlds.map((world, index) => (
            <a
              key={world.name}
              href={world.href}
              className={`${styles.room} ${styles[toneClass[index % toneClass.length]]}`}
              aria-label={`${world.name} — ${world.descriptor}`}
            >
              <div className={styles.thumb}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={world.image} alt="" className={styles.thumbImage} loading="lazy" />
              </div>
              <div className={styles.body}>
                <span className={styles.name}>{world.name}</span>
                <span className={styles.descriptor}>{world.descriptor}</span>
                <span className={styles.cta}>{world.cta}</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
