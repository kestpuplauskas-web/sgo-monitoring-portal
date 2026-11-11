import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(30).optional().default(""),
  city: z.string().trim().max(150).optional().default(""),
  service: z.string().trim().max(100).optional().default(""),
  power: z.string().trim().max(50).optional().default(""),
  message: z.string().trim().min(2).max(5000),
  page: z.string().trim().max(200).optional().default(""),
  hp_check: z.string().max(0).optional().default(""),
});

export const Route = createFileRoute("/api/public/inquiries")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let raw: Record<string, unknown> = {};
        try {
          const ct = request.headers.get("content-type") ?? "";
          if (ct.includes("application/json")) raw = (await request.json()) as Record<string, unknown>;
          else {
            const fd = await request.formData();
            fd.forEach((v, k) => { if (typeof v === "string") raw[k] = v; });
          }
        } catch {
          return Response.json({ success: false, error: "Neteisinga užklausa" }, { status: 400 });
        }
        if (typeof raw["hp_check"] === "string" && raw["hp_check"].length > 0) {
          return Response.json({ success: true });
        }
        const parsed = schema.safeParse(raw);
        if (!parsed.success) {
          return Response.json({ success: false, error: "Patikrinkite užpildytus laukus." }, { status: 400 });
        }
        const { hp_check: _hp, ...d } = parsed.data;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.from("inquiries").insert({ ...d, email: d.email.toLowerCase() });
        if (error) return Response.json({ success: false, error: "Nepavyko išsiųsti." }, { status: 500 });
        return Response.json({ success: true });
      },
    },
  },
});
