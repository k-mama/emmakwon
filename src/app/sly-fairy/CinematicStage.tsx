import styles from "./page.module.css";

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
  const toneClass = media.tone === "earth" ? styles.cinematicStageEarth : styles.cinematicStageWater;
  const hasAsset = Boolean(media.src) && media.kind !== "atmosphere";

  return (
    <figure className={`${styles.cinematicStage} ${toneClass}`}>
      <div className={styles.cinematicViewport}>
        {hasAsset && media.kind === "video" ? (
          <video
            className={styles.cinematicAsset}
            src={media.src ?? undefined}
            poster={media.poster ?? undefined}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-label={media.alt || undefined}
          />
        ) : null}

        {hasAsset && media.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className={styles.cinematicAsset}
            src={media.src ?? undefined}
            alt={media.alt}
            loading="lazy"
          />
        ) : null}

        {!hasAsset ? <div className={styles.cinematicAtmosphere} aria-hidden="true" /> : null}
        <div className={styles.cinematicScrim} aria-hidden="true" />

        <figcaption className={styles.cinematicCopy}>
          <p className={styles.cinematicEyebrow}>{media.eyebrow}</p>
          <p className={styles.cinematicTitle}>{media.title}</p>
          <p className={styles.cinematicCaption}>{media.caption}</p>
        </figcaption>
      </div>
    </figure>
  );
}