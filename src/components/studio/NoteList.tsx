import Link from "next/link";
import { formatStudioDate, type StudioPost } from "@/content/studio";
import styles from "./NoteList.module.css";

export default function NoteList({ posts }: { posts: StudioPost[] }) {
  return (
    <ul className={styles.list}>
      {posts.map((post) => (
        <li key={post.slug} className={styles.item}>
          <Link
            href={`/studio/notes/${post.slug}/`}
            className={`${styles.link} ${post.coverImage ? styles.linkWithCover : ""}`}
          >
            <span className={styles.category}>{post.category}</span>
            <span className={styles.title}>{post.title}</span>
            <span className={styles.excerpt}>{post.excerpt}</span>
            <span className={styles.date}>{formatStudioDate(post.publishedAt ?? post.createdAt)}</span>
            {post.coverImage ? (
              <span className={styles.thumb} aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.coverImage} alt="" loading="lazy" />
              </span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
