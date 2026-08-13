"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import NoteArticle from "@/components/studio/NoteArticle";
import { deleteAdminPost, upsertAdminPost } from "@/lib/adminStore";
import {
  brisbaneWallTimeToIso,
  formatBrisbaneDateTime,
  slugify,
  type StudioCategory,
  type StudioPost,
} from "@/content/studio";
import styles from "./PostForm.module.css";

const CATEGORIES: StudioCategory[] = ["BUILD", "LEARN", "MAKE"];

export default function PostForm({ post: initialPost, isNew }: { post: StudioPost; isNew: boolean }) {
  const router = useRouter();
  const [post, setPost] = useState<StudioPost>(initialPost);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [bodyText, setBodyText] = useState(initialPost.body.join("\n\n"));
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("10:00");
  const [notice, setNotice] = useState<string | null>(null);

  const update = <K extends keyof StudioPost>(key: K, value: StudioPost[K]) => {
    setPost((prev) => ({ ...prev, [key]: value }));
  };

  const currentBody = () =>
    bodyText
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);

  const persist = (overrides: Partial<StudioPost>) => {
    const next: StudioPost = { ...post, body: currentBody(), ...overrides };
    const saved = upsertAdminPost(next);
    setPost(saved);
    if (isNew) {
      router.replace(`/admin/posts/edit/?id=${saved.id}`);
    }
    return saved;
  };

  const handleSaveDraft = () => {
    persist({ status: "draft", scheduledAt: undefined });
    setNotice("Saved as draft.");
  };

  const handlePublishNow = () => {
    const nowIso = new Date().toISOString();
    persist({ status: "published", publishedAt: post.publishedAt ?? nowIso, scheduledAt: undefined });
    setNotice("Marked published in this admin. See the note above to make it live on the public site.");
  };

  const handleConfirmSchedule = () => {
    if (!scheduleDate) return;
    const iso = brisbaneWallTimeToIso(scheduleDate, scheduleTime);
    persist({ status: "scheduled", scheduledAt: iso });
    setScheduling(false);
    setNotice(`Scheduled for ${formatBrisbaneDateTime(iso)}. Automatic publication is not yet wired up — see the report.`);
  };

  const handleDelete = () => {
    if (isNew) return;
    if (!window.confirm("Delete this post? This can't be undone.")) return;
    deleteAdminPost(post.id);
    router.push("/admin/posts/");
  };

  const handleCopyAsCode = async () => {
    const codeBlock = postToSourceLiteral({ ...post, body: currentBody() });
    await navigator.clipboard.writeText(codeBlock);
    setNotice("Copied. Paste this object into src/content/studio.ts's studioPosts array, then commit and deploy to go live.");
  };

  const previewPost: StudioPost = { ...post, body: currentBody() };

  return (
    <div className={styles.wrap}>
      {post.status !== "draft" && (
        <p className={styles.statusBadge} data-status={post.status}>
          {post.status}
        </p>
      )}

      {!isNew && (
        <p className={styles.liveNote}>
          Changes here are saved in your browser only. To make a post live on the public site, use “Copy as code”
          below and add it to <code>src/content/studio.ts</code>, then deploy.
        </p>
      )}

      <label className={styles.field}>
        <span className={styles.label}>Title</span>
        <input
          type="text"
          className={styles.input}
          value={post.title}
          onChange={(event) => {
            update("title", event.target.value);
            if (!slugTouched) update("slug", slugify(event.target.value));
          }}
          placeholder="What actually happened?"
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Category</span>
        <div className={styles.categoryRow}>
          {CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              className={`${styles.categoryOption} ${post.category === category ? styles.categoryOptionActive : ""}`}
              onClick={() => update("category", category)}
            >
              {category}
            </button>
          ))}
        </div>
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Cover image (optional)</span>
        <input
          type="text"
          className={styles.input}
          value={post.coverImage ?? ""}
          onChange={(event) => update("coverImage", event.target.value || undefined)}
          placeholder="/archive/... or https://..."
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Excerpt</span>
        <textarea
          className={styles.textarea}
          rows={2}
          value={post.excerpt}
          onChange={(event) => update("excerpt", event.target.value)}
          placeholder="One or two sentences — shown in the Studio Notes list."
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Body</span>
        <textarea
          className={styles.textarea}
          rows={14}
          value={bodyText}
          onChange={(event) => setBodyText(event.target.value)}
          placeholder="Write in plain paragraphs. Leave a blank line between paragraphs."
        />
      </label>

      <button type="button" className={styles.advancedToggle} onClick={() => setShowAdvanced((value) => !value)}>
        {showAdvanced ? "Hide" : "Show"} advanced fields (slug, tags, SEO, external link)
      </button>

      {showAdvanced && (
        <div className={styles.advanced}>
          <label className={styles.field}>
            <span className={styles.label}>Slug</span>
            <input
              type="text"
              className={styles.input}
              value={post.slug}
              onChange={(event) => {
                setSlugTouched(true);
                update("slug", slugify(event.target.value));
              }}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Tags (comma separated)</span>
            <input
              type="text"
              className={styles.input}
              value={post.tags.join(", ")}
              onChange={(event) =>
                update(
                  "tags",
                  event.target.value
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                )
              }
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>SEO title</span>
            <input
              type="text"
              className={styles.input}
              value={post.seoTitle ?? ""}
              onChange={(event) => update("seoTitle", event.target.value || undefined)}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>SEO description</span>
            <textarea
              className={styles.textarea}
              rows={2}
              value={post.seoDescription ?? ""}
              onChange={(event) => update("seoDescription", event.target.value || undefined)}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>External link label (e.g. YouTube video)</span>
            <input
              type="text"
              className={styles.input}
              value={post.externalMedia?.[0]?.label ?? ""}
              onChange={(event) => {
                const label = event.target.value;
                const url = post.externalMedia?.[0]?.url ?? "";
                update("externalMedia", label || url ? [{ label, url }] : undefined);
              }}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>External link URL</span>
            <input
              type="text"
              className={styles.input}
              value={post.externalMedia?.[0]?.url ?? ""}
              onChange={(event) => {
                const url = event.target.value;
                const label = post.externalMedia?.[0]?.label ?? "";
                update("externalMedia", label || url ? [{ label, url }] : undefined);
              }}
            />
          </label>
        </div>
      )}

      {notice && <p className={styles.notice}>{notice}</p>}

      <div className={styles.controls}>
        <button type="button" className={styles.secondaryButton} onClick={handleSaveDraft}>
          Save Draft
        </button>
        <button type="button" className={styles.secondaryButton} onClick={() => setPreviewing(true)}>
          Preview
        </button>
        <button type="button" className={styles.secondaryButton} onClick={() => setScheduling((value) => !value)}>
          Schedule
        </button>
        <button type="button" className={styles.primaryButton} onClick={handlePublishNow}>
          Publish Now
        </button>
      </div>

      {scheduling && (
        <div className={styles.scheduleBox}>
          <p className={styles.scheduleLabel}>Publish at (Australia/Brisbane):</p>
          <div className={styles.scheduleRow}>
            <input
              type="date"
              className={styles.input}
              value={scheduleDate}
              onChange={(event) => setScheduleDate(event.target.value)}
            />
            <input
              type="time"
              className={styles.input}
              value={scheduleTime}
              onChange={(event) => setScheduleTime(event.target.value)}
            />
            <span className={styles.timezoneTag}>Australia/Brisbane</span>
          </div>
          {scheduleDate && (
            <p className={styles.schedulePreview}>
              {formatBrisbaneDateTime(brisbaneWallTimeToIso(scheduleDate, scheduleTime))}
            </p>
          )}
          <button type="button" className={styles.primaryButton} onClick={handleConfirmSchedule} disabled={!scheduleDate}>
            Confirm Schedule
          </button>
        </div>
      )}

      <div className={styles.footerRow}>
        <button type="button" className={styles.linkButton} onClick={handleCopyAsCode}>
          Copy as code (for studio.ts)
        </button>
        {!isNew && (
          <button type="button" className={styles.dangerLink} onClick={handleDelete}>
            Delete post
          </button>
        )}
      </div>

      {previewing && (
        <div className={styles.previewOverlay} role="dialog" aria-modal="true" aria-label="Public preview">
          <div className={styles.previewBar}>
            <span>Public preview — this is not saved or published</span>
            <button type="button" className={styles.secondaryButton} onClick={() => setPreviewing(false)}>
              Back to Edit
            </button>
          </div>
          <div className={styles.previewFrame}>
            <NoteArticle post={previewPost} />
          </div>
        </div>
      )}
    </div>
  );
}

function postToSourceLiteral(post: StudioPost): string {
  return JSON.stringify(post, null, 2);
}
