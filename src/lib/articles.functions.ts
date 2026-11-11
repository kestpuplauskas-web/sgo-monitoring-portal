import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createPublicClient } from "@/lib/public-db.server";

export const listPublishedArticles = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await createPublicClient()
    .from("articles")
    .select("slug,title,excerpt,cover_url,published_at")
    .eq("published", true)
    .order("published_at", { ascending: false });
  return data ?? [];
});

export const getPublishedArticle = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ slug: z.string().max(200) }).parse(i))
  .handler(async ({ data }) => {
    const { data: a } = await createPublicClient()
      .from("articles")
      .select("slug,title,excerpt,body,cover_url,meta_title,meta_description,published_at")
      .eq("published", true)
      .eq("slug", data.slug)
      .maybeSingle();
    return a;
  });
