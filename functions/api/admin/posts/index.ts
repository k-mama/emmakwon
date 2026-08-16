import type { PagesFunction } from "@cloudflare/workers-types";
import { errorJson, json, logAdminIssue, newRequestId, type Env } from "../../../_shared/env";
import { insertPost, listPosts } from "../../../../src/lib/studioRepository";
import type { StudioPost } from "../../../../src/lib/studioPublisher";

const ROUTE = "/api/admin/posts";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const requestId = newRequestId();
  try {
    const posts = await listPosts(context.env.STUDIO_DB);
    return json({ posts }, undefined, requestId);
  } catch (error) {
    logAdminIssue({ requestId, code: "D1_READ_FAILED", route: ROUTE, method: "GET", error });
    return errorJson("Could not load Studio posts.", 500, "D1_READ_FAILED", requestId);
  }
};

/** Creates a new draft. The server always owns the id and status so a
    malformed/stale client cannot collide with an existing row or bypass the
    explicit Publish Now pipeline. */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const requestId = newRequestId();

  let body: Partial<StudioPost>;
  try {
    const parsed: unknown = await context.request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return errorJson("JSON body must be an object.", 400, "INVALID_JSON", requestId);
    }
    body = parsed as Partial<StudioPost>;
  } catch {
    return errorJson("Invalid JSON body.", 400, "INVALID_JSON", requestId);
  }

  const now = new Date().toISOString();
  const post: StudioPost = {
    id: crypto.randomUUID(),
    title: body.title ?? "",
    slug: body.slug ?? "",
    excerpt: body.excerpt ?? "",
    coverImage: body.coverImage,
    body: body.body?.length ? body.body : [""],
    category: body.category ?? "BUILD",
    tags: body.tags ?? [],
    status: "draft",
    createdAt: now,
    updatedAt: now,
    seoTitle: body.seoTitle,
    seoDescription: body.seoDescription,
    externalMedia: body.externalMedia,
  };

  try {
    await insertPost(context.env.STUDIO_DB, post);
    return json({ post }, { status: 201 }, requestId);
  } catch (error) {
    logAdminIssue({ requestId, code: "D1_WRITE_FAILED", route: ROUTE, method: "POST", postId: post.id, error });
    return errorJson("Could not create this draft.", 500, "D1_WRITE_FAILED", requestId);
  }
};
