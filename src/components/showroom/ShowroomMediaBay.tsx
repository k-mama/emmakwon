import styles from "./ShowroomMediaBay.module.css";

type ShowroomTone = "violet" | "aqua" | "sun" | "rose";

type ShowroomMedia = {
  kind: "image" | "video";
  src: string;
  alt?: string;
  poster?: string;
};

type ShowroomMediaBayProps = {
  eyebrow: string;
  title: string;
  body: string;
  roomLabel: string;
  titleId?: string;
  tone?: ShowroomTone;
  media?: ShowroomMedia | null;
  reverse?: boolean;
};

const toneClass: Record<ShowroomTone, string> = {
  violet: styles.toneViolet,
  aqua: styles.toneAqua,
  sun: styles.toneSun,
  rose: styles.toneRose,
};

export default function ShowroomMediaBay({
  eyebrow,
  title,
  body,
  roomLabel,
  titleId,
  tone = "violet",
  media = null,
  reverse = false,
}: ShowroomMediaBayProps) {
  const shellClassName = [
    styles.shell,
    toneClass[tone],
    reverse ? styles.reverse : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClassName}>
      <div className={styles.media}>
        {media?.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={media.src} alt={media.alt ?? ""} className={styles.asset} loading="lazy" />
        ) : media?.kind === "video" ? (
          <video
            src={media.src}
            poster={media.poster}
            className={styles.asset}
            controls
            playsInline
            preload="metadata"
          />
        ) : (
          <div className={styles.emptyMedia} aria-hidden="true">
            <span className={styles.orbOne} />
            <span className={styles.orbTwo} />
            <span className={styles.lineOne} />
            <span className={styles.lineTwo} />
          </div>
        )}
        <p className={styles.roomLabel}>{roomLabel}</p>
      </div>

      <div className={styles.copy}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <p className={styles.body}>{body}</p>
      </div>
    </div>
  );
}
