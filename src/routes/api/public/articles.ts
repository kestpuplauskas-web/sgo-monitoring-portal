import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/articles")({
  server: {
    handlers: {
      GET: async () => {
        const { createPublicClient } = await import("@/lib/public-db.server");
        const { data } = await createPublicClient()
          .from("articles")
          .select("slug,title,excerpt,cover_url,published_at")
          .eq("published", true)
          .order("published_at", { ascending: false })
          .limit(3);
        return Response.json(data ?? [], { headers: { "cache-control": "public, max-age=300" } });
      },
    },
  },
});
