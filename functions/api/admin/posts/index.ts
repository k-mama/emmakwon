import type { PagesFunction } from "@cloudflare/workers-types";
import { errorJson, json, type Env } from "../../../_shared/env";
import { insertPost, listPosts } from "../../../../src/lib/studioRepository";
import type { StudioPost } from "../../../../src/lib/studioPublisher";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const posts = await listPosts(context.env.STUDIO_DB);
    return json({ posts });
  } catch (error) {
    return errorJson(error instanceof Error ? error.message : "Failed to load posts.", 500);
  }
};

/** Creates a new draft. Only title/category/etc. are accepted from the
    body — status is always "draft" here; publishing state only ever
    changes via /publish, so this route can't be used to sneak a post
    into "published" without going through the real pipeline. */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: Partial<StudioPost>;
  try {
    body = await context.request.json();
  } catch {
    return errorJson("Invalid JSON body.", 400);
  }

  const now = new Date().toISOString();
  const post: StudioPost = {
    id: body.id || crypto.randomUUID(),
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
    return errorJson(error instanceof Error ? error.message : "Failed to create draft.", 500);
  }
};
