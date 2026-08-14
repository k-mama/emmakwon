"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AdminGate from "@/components/admin/AdminGate";
import AdminShell from "@/components/admin/AdminShell";
import PostForm from "@/components/admin/PostForm";
import { fetchPost } from "@/lib/adminApiClient";
import type { StudioPost } from "@/content/studio";
import styles from "../page.module.css";

export default function EditPostPage() {
  return (
    <AdminGate>
      <AdminShell>
        <Suspense fallback={<p className={styles.empty}>Loading…</p>}>
          <EditPostLoader />
        </Suspense>
      </AdminShell>
    </AdminGate>
  );
}

function EditPostLoader() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [post, setPost] = useState<StudioPost | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    fetchPost(id)
      .then((loaded) => {
        if (cancelled) return;

        // Scheduled publishing is retired. If an old D1 row still carries
        // that legacy status, reopen it as a draft so the next explicit
        // Save Draft / Publish Now action moves it onto the supported path.
        setPost(
          loaded.status === "scheduled"
            ? { ...loaded, status: "draft", scheduledAt: undefined }
            : loaded,
        );
      })
      .catch((err: Error) => {
        if (!cancelled) setFetchError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  // "no id in the URL" is derivable straight from render input — no
  // effect needed for that branch, only for the real async fetch above.
  if (!id) return <p className={styles.errorState}>No post id given.</p>;
  if (fetchError) return <p className={styles.errorState}>{fetchError}</p>;
  if (!post) return <p className={styles.empty}>Loading…</p>;

  return <PostForm post={post} key={post.id} />;
}
