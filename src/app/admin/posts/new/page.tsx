"use client";

import { useState } from "react";
import AdminGate from "@/components/admin/AdminGate";
import AdminShell from "@/components/admin/AdminShell";
import PostForm from "@/components/admin/PostForm";
import { createDraftPost } from "@/lib/adminStore";

export default function NewPostPage() {
  const [draft] = useState(() => createDraftPost());

  return (
    <AdminGate>
      <AdminShell>
        <PostForm post={draft} isNew />
      </AdminShell>
    </AdminGate>
  );
}
