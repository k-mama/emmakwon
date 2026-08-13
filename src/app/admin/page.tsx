"use client";

import Link from "next/link";
import AdminGate from "@/components/admin/AdminGate";
import AdminShell from "@/components/admin/AdminShell";
import { getNextScheduledPost, useAdminPosts, sortByUpdatedDesc } from "@/lib/adminStore";
import { formatBrisbaneDateTime, formatStudioDate, type StudioPost } from "@/content/studio";
import styles from "./page.module.css";

export default function AdminHomePage() {
  const posts = useAdminPosts();

  return (
    <AdminGate>
      <AdminShell>
        <Dashboard posts={posts} />
      </AdminShell>
    </AdminGate>
  );
}

function Dashboard({ posts }: { posts: StudioPost[] }) {
  const nextScheduled = getNextScheduledPost(posts);
  const drafts = sortByUpdatedDesc(posts.filter((post) => post.status === "draft")).slice(0, 5);
  const published = sortByUpdatedDesc(posts.filter((post) => post.status === "published")).slice(0, 5);

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.headline}>Studio Admin</h1>
        <Link href="/admin/posts/new/" className={styles.newPost}>
          + New Post
        </Link>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Next to publish</h2>
        {nextScheduled && nextScheduled.scheduledAt ? (
          <Link href={`/admin/posts/edit/?id=${nextScheduled.id}`} className={styles.scheduledCard}>
            <span className={styles.scheduledTitle}>{nextScheduled.title || "Untitled"}</span>
            <span className={styles.scheduledWhen}>{formatBrisbaneDateTime(nextScheduled.scheduledAt)}</span>
          </Link>
        ) : (
          <p className={styles.empty}>Nothing scheduled.</p>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Drafts</h2>
          <Link href="/admin/posts/?status=draft" className={styles.viewAll}>
            View all →
          </Link>
        </div>
        {drafts.length > 0 ? (
          <ul className={styles.list}>
            {drafts.map((post) => (
              <li key={post.id}>
                <Link href={`/admin/posts/edit/?id=${post.id}`} className={styles.listLink}>
                  <span className={styles.listTitle}>{post.title || "Untitled"}</span>
                  <span className={styles.listMeta}>{post.category}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>No drafts.</p>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Published</h2>
          <Link href="/admin/posts/?status=published" className={styles.viewAll}>
            View all →
          </Link>
        </div>
        {published.length > 0 ? (
          <ul className={styles.list}>
            {published.map((post) => (
              <li key={post.id}>
                <Link href={`/admin/posts/edit/?id=${post.id}`} className={styles.listLink}>
                  <span className={styles.listTitle}>{post.title}</span>
                  <span className={styles.listMeta}>{post.publishedAt ? formatStudioDate(post.publishedAt) : ""}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>Nothing published yet.</p>
        )}
      </section>
    </>
  );
}
