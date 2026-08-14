"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import AdminGate from "@/components/admin/AdminGate";
import AdminShell from "@/components/admin/AdminShell";
import { fetchAllPosts } from "@/lib/adminApiClient";
import type { StudioPost, StudioPostStatus } from "@/content/studio";
import styles from "./page.module.css";

const FILTERS: { value: StudioPostStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "published", label: "Published" },
];

function sortByUpdatedDesc(posts: StudioPost[]): StudioPost[] {
  return [...posts].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<StudioPost[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchAllPosts()
      .then((loaded) => {
        if (!cancelled) setPosts(loaded);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AdminGate>
      <AdminShell>
        {error ? (
          <p className={styles.empty}>{error}</p>
        ) : posts === null ? (
          <p className={styles.empty}>Loading…</p>
        ) : (
          <Suspense fallback={<p className={styles.empty}>Loading…</p>}>
            <PostsList posts={posts} />
          </Suspense>
        )}
      </AdminShell>
    </AdminGate>
  );
}

function PostsList({ posts }: { posts: StudioPost[] }) {
  const searchParams = useSearchParams();
  const statusParam = searchParams.get("status");
  const activeFilter = (FILTERS.some((filter) => filter.value === statusParam) ? statusParam : "all") as
    | StudioPostStatus
    | "all";

  const filtered = useMemo(() => {
    const scoped = activeFilter === "all" ? posts : posts.filter((post) => post.status === activeFilter);
    return sortByUpdatedDesc(scoped);
  }, [posts, activeFilter]);

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.headline}>Posts</h1>
        <Link href="/admin/posts/new/" className={styles.newPost}>
          + New Post
        </Link>
      </div>

      <div className={styles.filters}>
        {FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={filter.value === "all" ? "/admin/posts/" : `/admin/posts/?status=${filter.value}`}
            className={`${styles.filter} ${activeFilter === filter.value ? styles.filterActive : ""}`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      {filtered.length > 0 ? (
        <ul className={styles.list}>
          {filtered.map((post) => (
            <li key={post.id}>
              <Link href={`/admin/posts/edit/?id=${post.id}`} className={styles.listLink}>
                <span className={styles.listStatus}>{post.status}</span>
                <span className={styles.listTitle}>{post.title || "Untitled"}</span>
                <span className={styles.listMeta}>{post.category}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>No posts here yet.</p>
      )}
    </>
  );
}
