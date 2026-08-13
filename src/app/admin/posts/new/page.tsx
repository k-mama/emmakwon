"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminGate from "@/components/admin/AdminGate";
import AdminShell from "@/components/admin/AdminShell";
import { createDraft } from "@/lib/adminApiClient";
import styles from "../page.module.css";

export default function NewPostPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    createDraft()
      .then((post) => {
        if (!cancelled) router.replace(`/admin/posts/edit/?id=${post.id}`);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <AdminGate>
      <AdminShell>
        <p className={error ? styles.errorState : styles.empty}>{error ?? "Creating draft…"}</p>
      </AdminShell>
    </AdminGate>
  );
}
