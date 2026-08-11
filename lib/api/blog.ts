import { apiRequest } from "./client";
import type { BlogPost } from "./types";

export function listPublishedPosts() {
  return apiRequest<BlogPost[]>("/blog");
}

export function getPublishedPostBySlug(slug: string) {
  return apiRequest<BlogPost>(`/blog/${slug}`);
}
