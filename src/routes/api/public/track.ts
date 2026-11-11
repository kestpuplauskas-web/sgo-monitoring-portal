import { createFileRoute } from "@tanstack/react-router";

const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse/i;

export const Route = createFileRoute("/api/public/track")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ua = request.headers.get("user-agent") ?? "";
        if (BOT.test(ua)) return new Response(null, { status: 204 });
        let b: { path?: unknown; referrer?: unknown; vid?: unknown } = {};
        try {
          b = JSON.parse(await request.text());
        } catch {
          return new Response(null, { status: 204 });
        }
        const path = typeof b.path === "string" ? b.path.slice(0, 300) : "";
        if (!path.startsWith("/") || path.startsWith("/admin")) return new Response(null, { status: 204 });
        let referrer = typeof b.referrer === "string" ? b.referrer.slice(0, 300) : "";
        try {
          const host = new URL(request.url).host;
          if (referrer && new URL(referrer).host === host) referrer = "";
        } catch {
          referrer = "";
        }
        const device = /mobi|android|iphone/i.test(ua) ? "Mobilus" : "Kompiuteris";
        const vid = typeof b.vid === "string" ? b.vid.slice(0, 64) : "";
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("page_views").insert({ path, referrer, visitor_id: vid, device });
        return new Response(null, { status: 204 });
      },
    },
  },
});
