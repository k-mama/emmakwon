"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AdminGate from "@/components/admin/AdminGate";
import AdminShell from "@/components/admin/AdminShell";
import PostForm from "@/components/admin/PostForm";
import { useAdminPosts } from "@/lib/adminStore";
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
  const posts = useAdminPosts();
  const post = id ? posts.find((candidate) => candidate.id === id) : undefined;

  if (!post) return <p className={styles.empty}>Post not found.</p>;

  return <PostForm post={post} isNew={false} key={post.id} />;
}
