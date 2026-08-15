import Link from "next/link";
import { formatStudioDate, type StudioPost } from "@/content/studio";
import styles from "./NoteArticle.module.css";

type NoteArticleProps = {
  post: StudioPost;
  /** Omit to render with no back link (e.g. inside an admin preview). */
  back?: { href: string; label: string };
};

// The single real rendering of a Studio Note — used by the public
// /studio/notes/[slug] page and by the admin preview, so preview always
// shows exactly what will go live, not a separate approximation.
export default function NoteArticle({ post, back }: NoteArticleProps) {
  const externalMedia =
    post.externalMedia
      ?.map((media) => ({ label: media.label.trim(), url: media.url.trim() }))
      .filter((media) => media.label && media.url && media.url !== "#") ?? [];

  return (
    <article className={styles.article}>
      <div className="container">
        {back && (
          <p className={styles.eyebrow}>
            <Link href={back.href} className={styles.backLink}>
              {back.label}
            </Link>
          </p>
        )}
        <p className={styles.category}>{post.category}</p>
        <h1 className={styles.headline}>{post.title}</h1>
        <p className={styles.date}>{post.publishedAt ? formatStudioDate(post.publishedAt) : "Not yet published"}</p>

        {post.coverImage && (
          <div className={styles.coverFrame}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.coverImage}
              alt=""
              className={styles.coverImage}
              loading="lazy"
              decoding="async"
            />
          </div>
        )}

        <div className={styles.body}>
          {post.body.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>

        {externalMedia.length > 0 && (
          <p className={styles.media}>
            {externalMedia.map((media, index) => (
              <span key={`${media.url}-${index}`}>
                <a href={media.url}>{media.label}</a>
                {index < externalMedia.length - 1 ? <span aria-hidden="true"> · </span> : null}
              </span>
            ))}
          </p>
        )}

        {post.tags.length > 0 && (
          <p className={styles.tags}>
            {post.tags.map((tag, index) => (
              <span key={tag}>
                {tag}
                {index < post.tags.length - 1 ? <span aria-hidden="true"> · </span> : null}
              </span>
            ))}
          </p>
        )}
      </div>
    </article>
  );
}
