import Link from "next/link";
import { houseIndex } from "@/content/home";
import styles from "./HomeHouse.module.css";

export default function HomeHouse() {
  return (
    <section className={styles.house} aria-labelledby="house-title">
      <div className="container">
        <header className={styles.intro}>
          <p className={styles.eyebrow}>{houseIndex.eyebrow}</p>
          <h2 id="house-title" className={styles.title}>
            {houseIndex.headline}
          </h2>
          <p className={styles.supporting}>{houseIndex.supporting}</p>
        </header>

        <Link className={styles.feature} href={houseIndex.feature.href}>
          <figure className={styles.featureMedia}>
            <img
              src={houseIndex.feature.image}
              alt={houseIndex.feature.imageAlt}
              loading="lazy"
              decoding="async"
            />
            <div className={styles.mediaScrim} aria-hidden="true" />
          </figure>

          <div className={styles.featureCopy}>
            <p className={styles.featureEyebrow}>{houseIndex.feature.eyebrow}</p>
            <h3>{houseIndex.feature.title}</h3>
            <p className={styles.featureLead}>{houseIndex.feature.body}</p>
            <p className={styles.featureBody}>{houseIndex.feature.supporting}</p>
            <span className={styles.featureCta}>
              {houseIndex.feature.cta} <span aria-hidden="true">→</span>
            </span>
          </div>
        </Link>

        <nav className={styles.rooms} aria-label="Explore the creative house">
          {houseIndex.rooms.map((room) => (
            <Link className={styles.room} href={room.href} key={room.name}>
              <span className={styles.roomCategory}>{room.category}</span>
              <span className={styles.roomName}>{room.name}</span>
              <span className={styles.roomArrow} aria-hidden="true">
                →
              </span>
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
}
