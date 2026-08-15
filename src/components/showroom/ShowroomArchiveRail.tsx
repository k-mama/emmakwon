import Link from "next/link";
import styles from "./ShowroomArchiveRail.module.css";

type ArchiveTone = "water" | "paper" | "studio" | "sun";

type ArchiveMedia = {
  src: string;
  alt: string;
};

export type ShowroomArchiveItem = {
  label: string;
  title: string;
  note: string;
  href?: string;
  media?: ArchiveMedia | null;
};

type ShowroomArchiveRailProps = {
  id?: string;
  eyebrow: string;
  title: string;
  intro: string;
  items: ShowroomArchiveItem[];
  tone?: ArchiveTone;
};

const toneClass: Record<ArchiveTone, string> = {
  water: styles.toneWater,
  paper: styles.tonePaper,
  studio: styles.toneStudio,
  sun: styles.toneSun,
};

function ArchiveItem({ item, index }: { item: ShowroomArchiveItem; index: number }) {
  const content = (
    <>
      <div className={styles.visual}>
        {item.media ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.media.src} alt={item.media.alt} className={styles.image} loading="lazy" />
        ) : (
          <div className={styles.placeholder} aria-hidden="true">
            <span className={styles.placeholderIndex}>{String(index + 1).padStart(2, "0")}</span>
          </div>
        )}
      </div>
      <div className={styles.itemCopy}>
        <p className={styles.itemLabel}>{item.label}</p>
        <h3 className={styles.itemTitle}>{item.title}</h3>
        <p className={styles.itemNote}>{item.note}</p>
        {item.href ? <span className={styles.itemArrow} aria-hidden="true">↗</span> : null}
      </div>
    </>
  );

  return item.href ? (
    <Link href={item.href} className={styles.item}>
      {content}
    </Link>
  ) : (
    <article className={styles.item}>{content}</article>
  );
}

export default function ShowroomArchiveRail({
  id,
  eyebrow,
  title,
  intro,
  items,
  tone = "paper",
}: ShowroomArchiveRailProps) {
  const headingId = id ? `${id}-heading` : undefined;

  return (
    <section id={id} className={`${styles.section} ${toneClass[tone]}`} aria-labelledby={headingId}>
      <div className="container">
        <div className={styles.introGrid}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <div>
            <h2 id={headingId} className={styles.title}>{title}</h2>
            <p className={styles.intro}>{intro}</p>
          </div>
        </div>

        {items.length > 1 ? (
          <p className={styles.mobileHint} aria-hidden="true">
            SWIPE TO EXPLORE <span>→</span>
          </p>
        ) : null}

        <div className={styles.rail} aria-label={`${title} items`}>
          {items.map((item, index) => (
            <ArchiveItem key={`${item.label}-${item.title}`} item={item} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
