import Link from "next/link";
import { houseIndex } from "@/content/home";
import styles from "./HomeHouse.module.css";

const homeHouseBackground = [
  "radial-gradient(64% 54% at 8% 12%, rgba(126, 218, 226, 0.24) 0%, rgba(126, 218, 226, 0) 72%)",
  "radial-gradient(58% 54% at 92% 20%, rgba(202, 164, 218, 0.2) 0%, rgba(202, 164, 218, 0) 74%)",
  "radial-gradient(62% 58% at 86% 92%, rgba(239, 165, 180, 0.16) 0%, rgba(239, 165, 180, 0) 74%)",
  "#fcfbf8",
].join(", ");

export default function HomeHouse() {
  return (
    <section className={styles.house} style={{ background: homeHouseBackground }} aria-labelledby="house-title">
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
            {/* Static export intentionally uses the original lightweight asset directly. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
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
          {houseIndex.rooms.map((room, index) => (
            <Link className={styles.room} href={room.href} key={room.name}>
              <span className={styles.roomNumber} aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className={styles.roomIdentity}>
                <span className={styles.roomCategory}>{room.category}</span>
                <span className={styles.roomName}>{room.name}</span>
              </span>
              <span className={styles.roomDescriptor}>{room.descriptor}</span>
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
