import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), page: z.string().max(200).optional().default("") }),
  z.object({ action: z.literal("send"), id: z.string().uuid(), token: z.string().min(20).max(100), text: z.string().trim().min(1).max(2000) }),
  z.object({ action: z.literal("human"), id: z.string().uuid(), token: z.string().min(20).max(100), name: z.string().trim().max(100).optional().default(""), email: z.string().trim().max(255).optional().default("") }),
]);

const GREETING = "Sveiki! Aš SGO Asistentas 👋 Padėsiu išsirinkti tinkamiausią elektrinės priežiūros planą ar atsakysiu į klausimus apie gedimus. Kuo galiu padėti?";

async function db() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

async function auth(id: string, token: string) {
  const a = await db();
  const { data } = await a.from("chat_sessions").select("*").eq("id", id).maybeSingle();
  if (!data || data.token !== token) return null;
  return data;
}

async function plansText() {
  const a = await db();
  const { data } = await a.from("plans").select("name,price,old_price,period_label,tagline,promo,activation_fee").eq("active", true).order("sort_order");
  return (data ?? []).map((p) => `- ${p.name}: ${p.price} € ${p.period_label ?? ""}${p.old_price ? ` (vietoj ${p.old_price} €)` : ""}; ${p.tagline ?? ""}${p.promo ? `; akcija: ${p.promo}` : ""}; aktyvavimas ${p.activation_fee ?? 0} €`).join("\n");
}

async function escalate(s: { id: string; visitor_name: string; visitor_email: string }, last: string, origin: string) {
  const a = await db();
  await a.from("chat_sessions").update({ status: "waiting" }).eq("id", s.id);
  await a.from("chat_messages").insert({ session_id: s.id, role: "system", content: "Pakviestas SGO specialistas. Jis prisijungs kuo greičiau — galite toliau rašyti čia." });
  const { notifyHandoff } = await import("@/lib/chat.server");
  await notifyHandoff({ sessionId: s.id, lastMessage: last, name: s.visitor_name, email: s.visitor_email, origin });
}

const MAX_AI_MESSAGES = 15;
const LIMIT_MSG = "Kad galėtume tiksliau padėti, palikite savo telefono numerį arba paspauskite „Noriu pasikalbėti su specialistu“ — SGO specialistas su jumis susisieks. Taip pat galite skambinti +370 606 06222.";

export const Route = createFileRoute("/api/public/chat")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const u = new URL(request.url);
        const id = u.searchParams.get("id") ?? "";
        const token = u.searchParams.get("token") ?? "";
        if (!z.string().uuid().safeParse(id).success) return Response.json({ error: "bad" }, { status: 400 });
        const s = await auth(id, token);
        if (!s) return Response.json({ error: "not_found" }, { status: 404 });
        const a = await db();
        const { data } = await a.from("chat_messages").select("id,role,content,created_at").eq("session_id", id).order("created_at").limit(200);
        return Response.json({ status: s.status, messages: data ?? [] });
      },
      POST: async ({ request }) => {
        let raw: unknown;
        try { raw = await request.json(); } catch { return Response.json({ error: "bad" }, { status: 400 }); }
        const p = body.safeParse(raw);
        if (!p.success) return Response.json({ error: "bad" }, { status: 400 });
        const d = p.data;
        const a = await db();
        const origin = "https://sgo.lt";

        if (d.action === "start") {
          const token = crypto.randomUUID() + crypto.randomUUID();
          const { data, error } = await a.from("chat_sessions").insert({ token, page: d.page, last_message: GREETING }).select("id").single();
          if (error || !data) return Response.json({ error: "fail" }, { status: 500 });
          await a.from("chat_messages").insert({ session_id: data.id, role: "agent", content: GREETING });
          return Response.json({ id: data.id, token });
        }

        const s = await auth(d.id, d.token);
        if (!s) return Response.json({ error: "not_found" }, { status: 404 });

        if (d.action === "human") {
          if (d.name || d.email) await a.from("chat_sessions").update({ visitor_name: d.name || s.visitor_name, visitor_email: d.email || s.visitor_email }).eq("id", s.id);
          if (s.status === "agent" || s.status === "closed") await escalate({ ...s, visitor_name: d.name || s.visitor_name, visitor_email: d.email || s.visitor_email }, s.last_message, origin);
          return Response.json({ ok: true });
        }

        // send — anti-bot guards
        const { data: lastV } = await a.from("chat_messages").select("created_at").eq("session_id", s.id).eq("role", "visitor").order("created_at", { ascending: false }).limit(1);
        if (lastV?.[0] && Date.now() - new Date(lastV[0].created_at).getTime() < 3000) return Response.json({ error: "too_fast" }, { status: 429 });
        const { count: vCount } = await a.from("chat_messages").select("id", { count: "exact", head: true }).eq("session_id", s.id).eq("role", "visitor");
        await a.from("chat_messages").insert({ session_id: s.id, role: "visitor", content: d.text });
        await a.from("chat_sessions").update({ last_message: d.text, last_message_at: new Date().toISOString(), status: s.status === "closed" ? "agent" : s.status }).eq("id", s.id);
        const status = s.status === "closed" ? "agent" : s.status;
        if (status !== "agent") return Response.json({ ok: true });
        if ((vCount ?? 0) >= MAX_AI_MESSAGES) {
          await a.from("chat_messages").insert({ session_id: s.id, role: "agent", content: LIMIT_MSG });
          return Response.json({ ok: true });
        }

        const { agentReply, wantsHuman } = await import("@/lib/chat.server");
        if (wantsHuman(d.text)) { await escalate(s, d.text, origin); return Response.json({ ok: true }); }
        const { data: hist } = await a.from("chat_messages").select("role,content").eq("session_id", s.id).in("role", ["visitor", "agent", "admin"]).order("created_at").limit(40);
        try {
          const r = await agentReply(hist ?? [], await plansText());
          await a.from("chat_messages").insert({ session_id: s.id, role: "agent", content: r.text });
          await a.from("chat_sessions").update({ last_message_at: new Date().toISOString() }).eq("id", s.id);
          if (r.lead) {
            const L = r.lead;
            const email = (L.email && /.+@.+\..+/.test(L.email) ? L.email : s.visitor_email || "").toLowerCase();
            await a.from("inquiries").insert({
              name: L.name || s.visitor_name || "Pokalbio klientas", email, phone: L.phone, city: L.city, service: L.service,
              message: `${L.problem || "Remonto / apžiūros užklausa"}\n\n(Gauta per SGO Asistento pokalbį)`, page: "chat",
            });
            await a.from("chat_sessions").update({ status: "closed", visitor_name: L.name || s.visitor_name, visitor_email: email }).eq("id", s.id);
            await a.from("chat_messages").insert({ session_id: s.id, role: "system", content: "Užklausa perduota SGO specialistui." });
          } else if (r.handoff) await escalate(s, d.text, origin);
        } catch (e) {
          console.error("Agent failed", e);
          await escalate(s, d.text, origin);
        }
        return Response.json({ ok: true });
      },
    },
  },
});
