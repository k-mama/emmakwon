"use client";

import { useState } from "react";
import AdminGate from "@/components/admin/AdminGate";
import AdminShell from "@/components/admin/AdminShell";
import PostForm from "@/components/admin/PostForm";
import type { StudioPost } from "@/content/studio";

export default function NewPostPage() {
  // New Post starts as a purely local, unsaved form. Nothing is written
  // to D1 until Emma explicitly chooses Save Draft or Publish Now.
  const [post] = useState<StudioPost>(() => {
    const now = new Date().toISOString();
    return {
      id: "",
      title: "",
      slug: "",
      excerpt: "",
      body: [""],
      category: "BUILD",
      tags: [],
      status: "draft",
      createdAt: now,
      updatedAt: now,
    };
  });

  return (
    <AdminGate>
      <AdminShell>
        <PostForm post={post} />
      </AdminShell>
    </AdminGate>
  );
}
