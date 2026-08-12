import styles from "./Hero.module.css";
import HeroVideo from "./HeroVideo";

export default function Hero() {
  return (
    <section id="hero" className={styles.hero} aria-label="The wave is already here. Come surf it with me.">
      <div className={`${styles.field} ${styles.fieldLeft}`} aria-hidden="true" />

      <div className={styles.canvas}>
        <div className={styles.videoWrap}>
          <HeroVideo />
          <div className={styles.scrim} aria-hidden="true" />
          <div className={styles.copy}>
            <p className={styles.headline}>THE WAVE IS ALREADY HERE.</p>
            <p className={styles.sub}>Come surf it with me.</p>
          </div>
        </div>
      </div>

      <div className={`${styles.field} ${styles.fieldRight}`} aria-hidden="true" />
    </section>
  );
}
