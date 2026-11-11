import { createFileRoute } from "@tanstack/react-router";

// Serves the original static sgo.lt page from public/ unchanged.
export const Route = createFileRoute("/diagnostika")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const res = await fetch(new URL("/diagnostika/index.html", request.url));
        return new Response(res.body, {
          status: res.status,
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      },
    },
  },
});
