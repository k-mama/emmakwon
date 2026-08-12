import { curatedWorlds, type World } from "@/content/home";
import styles from "./CuratedWorlds.module.css";

// Each room carries its own subtle atmospheric color character (see
// .tone* in CuratedWorlds.module.css) while staying within the same
// restrained cream/ivory card system.
const toneClass = {
  "SLY FAIRY": styles.toneSlyFairy,
  EMMAESTRO: styles.toneEmmaestro,
  "K-MAMA": styles.toneKMama,
  BOOKS: styles.toneBooks,
} as const;

function Room({ world }: { world: World }) {
  const tone = toneClass[world.name as keyof typeof toneClass];

  return (
    <a href={world.href} className={`${styles.room} ${tone}`} aria-label={`${world.name} — ${world.descriptor}`}>
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
  );
}

export default function CuratedWorlds() {
  const [slyFairy, emmaestro, kMama, books] = curatedWorlds.worlds;

  return (
    <section id="inside-the-house" className={styles.section} aria-labelledby="house-heading">
      <div className="container">
        <p className={styles.eyebrow}>{curatedWorlds.eyebrow}</p>
        <h2 id="house-heading" className={styles.headline}>
          {curatedWorlds.headline}
        </h2>

        <div className={styles.rooms}>
          <div className={`${styles.row} ${styles.rowA}`}>
            <Room world={slyFairy} />
            <Room world={emmaestro} />
          </div>
          <div className={`${styles.row} ${styles.rowB}`}>
            <Room world={kMama} />
            <Room world={books} />
          </div>
        </div>
      </div>
    </section>
  );
}
