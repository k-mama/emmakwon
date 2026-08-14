import CinematicVideo from "./CinematicVideo";
import styles from "./CinematicStage.module.css";

type CinematicMedia = {
  kind: "atmosphere" | "image" | "video";
  src: string | null;
  poster: string | null;
  alt: string;
  tone: "water" | "earth";
  eyebrow: string;
  title: string;
  caption: string;
};

export default function CinematicStage({ media }: { media: CinematicMedia }) {
  const toneClass = media.tone === "earth" ? styles.earth : styles.water;
  const hasAsset = Boolean(media.src) && media.kind !== "atmosphere";

  return (
    <figure className={`${styles.stage} ${toneClass}`}>
      <div className={styles.viewport}>
        {hasAsset && media.kind === "video" && media.src ? (
          <CinematicVideo src={media.src} poster={media.poster ?? undefined} alt={media.alt} />
        ) : null}

        {hasAsset && media.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className={styles.asset}
            src={media.src ?? undefined}
            alt={media.alt}
            loading="lazy"
          />
        ) : null}

        {!hasAsset ? <div className={styles.atmosphere} aria-hidden="true" /> : null}
        <div className={styles.scrim} aria-hidden="true" />

        <figcaption className={styles.copy}>
          <p className={styles.eyebrow}>{media.eyebrow}</p>
          <p className={styles.title}>{media.title}</p>
          <p className={styles.caption}>{media.caption}</p>
        </figcaption>
      </div>
    </figure>
  );
}
