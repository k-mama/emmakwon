import { curatedWorlds } from "@/content/home";
import styles from "./CuratedWorlds.module.css";

export default function CuratedWorlds() {
  return (
    <section id="inside-the-house" className={styles.section} aria-labelledby="house-heading">
      <div className="container">
        <div className={styles.headingWrap}>
          <p className={styles.eyebrow}>{curatedWorlds.eyebrow}</p>
          <h2 id="house-heading" className={styles.headline}>
            {curatedWorlds.headline}
          </h2>
        </div>

        <div className={styles.rooms}>
          {curatedWorlds.worlds.map((world) => (
            <a key={world.name} href={world.href} className={styles.room}>
              <div className={styles.top}>
                <span className={styles.kicker}>{world.category}</span>

                <div className={styles.thumb}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={world.image} alt="" className={styles.thumbImage} loading="lazy" />
                </div>
              </div>

              <div>
                <h3 className={styles.name}>{world.name}</h3>
                <p className={styles.descriptor}>{world.descriptor}</p>
                <span className={styles.cta}>{world.cta}</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
