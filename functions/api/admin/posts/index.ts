import type { PagesFunction } from "@cloudflare/workers-types";
import { errorJson, json, type Env } from "../../../_shared/env";
import { insertPost, listPosts } from "../../../../src/lib/studioRepository";
import type { StudioPost } from "../../../../src/lib/studioPublisher";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const posts = await listPosts(context.env.STUDIO_DB);
    return json({ posts });
  } catch (error) {
    console.error("Studio admin list failed", error);
    return errorJson("Could not load Studio posts.", 500);
  }
};

/** Creates a new draft. The server always owns the id and status so a
    malformed/stale client cannot collide with an existing row or bypass the
    explicit Publish Now pipeline. */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: Partial<StudioPost>;
  try {
    const parsed: unknown = await context.request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return errorJson("JSON body must be an object.", 400);
    }
    body = parsed as Partial<StudioPost>;
  } catch {
    return errorJson("Invalid JSON body.", 400);
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
    return json({ post }, { status: 201 });
  } catch (error) {
    console.error("Studio draft creation failed", error);
    return errorJson("Could not create this draft.", 500);
  }
};
