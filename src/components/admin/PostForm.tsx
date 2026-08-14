"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import NoteArticle from "@/components/studio/NoteArticle";
import { deletePost as deletePostApi, publishPost, savePost } from "@/lib/adminApiClient";
import {
  brisbaneWallTimeToIso,
  formatBrisbaneDateTime,
  slugify,
  type StudioCategory,
  type StudioPost,
} from "@/content/studio";
import styles from "./PostForm.module.css";

const CATEGORIES: StudioCategory[] = ["BUILD", "LEARN", "MAKE"];

type SaveState = "idle" | "saving" | "error";
type PublishState = "idle" | "publishing" | "published" | "error";

export default function PostForm({ post: initialPost }: { post: StudioPost }) {
  const router = useRouter();
  const [post, setPost] = useState<StudioPost>(initialPost);
  const [slugTouched, setSlugTouched] = useState(Boolean(initialPost.slug));
  const [bodyText, setBodyText] = useState(initialPost.body.join("\n\n"));
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("10:00");

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [publishState, setPublishState] = useState<PublishState>("idle");
  const [publishError, setPublishError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const busy = saveState === "saving" || publishState === "publishing" || deleting;

  const update = <K extends keyof StudioPost>(key: K, value: StudioPost[K]) => {
    setPost((prev) => ({ ...prev, [key]: value }));
  };

  const currentBody = () =>
    bodyText
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);

  const save = async (overrides: Partial<StudioPost>): Promise<StudioPost | null> => {
    setSaveState("saving");
    setSaveError(null);
    try {
      const patch: Partial<StudioPost> = {
        ...post,
        body: currentBody(),
        ...overrides,
        // The PATCH endpoint always rejects status:"published" — only
        // POST .../publish may make that transition. When republishing
        // an already-published post (Publish Now saving latest edits
        // before it re-publishes), post.status is already "published",
        // so echoing it back here would trip that guard for no reason.
        // Omit it from the outgoing JSON (JSON.stringify drops
        // undefined) so the server's existing-row merge just preserves
        // "published" as-is. Explicit overrides (draft/scheduled) are
        // never affected by this.
        status: overrides.status ?? (post.status === "published" ? undefined : post.status),
      };
      const saved = await savePost(post.id, patch);
      setPost(saved);
      setSaveState("idle");
      return saved;
    } catch (error) {
      setSaveState("error");
      setSaveError(error instanceof Error ? error.message : "Unknown error.");
      return null;
    }
  };

  const handleSaveDraft = async () => {
    setPublishState("idle");
    await save({ status: "draft", scheduledAt: undefined });
  };

  const handlePublishNow = async () => {
    setPublishState("publishing");
    setPublishError(null);

    // Publish reads whatever is currently in D1, so the latest edits
    // must land there first — this IS "save latest editorial state",
    // not a separate draft save.
    const saved = await save({});
    if (!saved) {
      setPublishState("error");
      setPublishError("Could not save your latest changes, so publishing was stopped before contacting GitHub.");
      return;
    }

    try {
      const result = await publishPost(saved.id);
      setPost((prev) => ({ ...prev, status: "published", publishedAt: result.publishedAt, scheduledAt: undefined }));
      setPublishState("published");
    } catch (error) {
      setPublishState("error");
      setPublishError(error instanceof Error ? error.message : "Unknown error.");
    }
  };

  const handleConfirmSchedule = async () => {
    if (!scheduleDate) return;
    setPublishState("idle");
    const iso = brisbaneWallTimeToIso(scheduleDate, scheduleTime);
    const saved = await save({ status: "scheduled", scheduledAt: iso });
    if (saved) setScheduling(false);
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this post? This can't be undone.")) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deletePostApi(post.id);
      router.push("/admin/posts/");
    } catch (error) {
      setDeleting(false);
      setDeleteError(error instanceof Error ? error.message : "Unknown error.");
    }
  };

  const previewPost: StudioPost = { ...post, body: currentBody() };

  return (
    <div className={styles.wrap}>
      {post.status !== "draft" && (
        <p className={styles.statusBadge} data-status={post.status}>
          {post.status}
          {post.status === "scheduled" && post.scheduledAt && (
            <span className={styles.statusBadgeDetail}> · {formatBrisbaneDateTime(post.scheduledAt)}</span>
          )}
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

      {saveState === "error" && saveError && <p className={styles.errorNotice}>Could not save draft. {saveError}</p>}
      {deleteError && <p className={styles.errorNotice}>Could not delete post. {deleteError}</p>}

      {publishState === "published" && (
        <p className={styles.successNotice}>
          Published. Site deployment has started.{" "}
          <a href={`/studio/notes/${post.slug}/`} className={styles.viewPublicLink}>
            View public page →
          </a>
        </p>
      )}
      {publishState === "error" && publishError && (
        <p className={styles.errorNotice}>
          Could not publish to GitHub.{" "}
          {post.status === "published"
            ? "The previously published version is still live"
            : post.status === "scheduled"
              ? "Publication is still scheduled"
              : "Publication is still a draft"}{" "}
          because the attempt failed — nothing was lost. {publishError}
        </p>
      )}

      <div className={styles.controls}>
        <button type="button" className={styles.secondaryButton} onClick={handleSaveDraft} disabled={busy}>
          {saveState === "saving" ? "Saving…" : "Save Draft"}
        </button>
        <button type="button" className={styles.secondaryButton} onClick={() => setPreviewing(true)} disabled={busy}>
          Preview
        </button>
        <button type="button" className={styles.secondaryButton} onClick={() => setScheduling((value) => !value)} disabled={busy}>
          Schedule
        </button>
        <button type="button" className={styles.primaryButton} onClick={handlePublishNow} disabled={busy}>
          {publishState === "publishing" ? "Publishing…" : "Publish Now"}
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
          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleConfirmSchedule}
            disabled={!scheduleDate || busy}
          >
            {saveState === "saving" ? "Saving…" : "Confirm Schedule"}
          </button>
        </div>
      )}

      <div className={styles.footerRow}>
        <button type="button" className={styles.dangerLink} onClick={handleDelete} disabled={busy}>
          {deleting ? "Deleting…" : "Delete post"}
        </button>
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
