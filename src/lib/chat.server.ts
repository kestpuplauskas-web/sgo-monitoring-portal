import { generateResponse } from "@lovable.dev/ai-gateway";

export const CHAT_NOTIFY_EMAIL = "mindaugas@sviesosenergija.lt";

const HUMAN_RE = /(specialist|žmog|zmog|operator|vadybinink|gyvai|tikru žmog|konsultant|paskambin|susisiekit)/i;
export const wantsHuman = (t: string) => HUMAN_RE.test(t);

type Msg = { role: string; content: string };

export async function agentReply(history: Msg[], plansText: string): Promise<{ text: string; handoff: boolean }> {
  const instructions = `Tu esi „SGO Asistentas“ — draugiškas SGO (sgo.lt) saulės elektrinių stebėsenos, diagnostikos ir serviso konsultantas. Visada atsakyk lietuviškai (nebent klientas rašo kita kalba), trumpai — 1–4 sakiniai, aiškiai, be žargono. Rašyk paprastu tekstu — jokio markdown (be **, #, [ ](…)); nuorodas rašyk tiesiog kaip sgo.lt/#planai.
Tikslas: padėti klientui suprasti, kuris planas jam tinka, ir paskatinti užsisakyti planą svetainės skiltyje „Planai“ (sgo.lt/#planai) arba palikti kontaktus.
SGO planai (aktualios kainos):
${plansText}
Papildomos paslaugos: diagnostika vietoje 79 €, servisas 45 €/val., išvykimas 0,50 €/km. Telefonas +370 606 06222, el. paštas info@sgo.lt.
Nežinodamas fakto neišsigalvok — pasiūlyk sujungti su specialistu. Jei klientas nori kalbėti su žmogumi, turi skubų gedimą, skundą ar klausimą, į kurį negali atsakyti, atsakymo pabaigoje parašyk žymę [SPECIALISTAS].`;
  const res = await generateResponse({
    model: "openai/gpt-6-astra",
    instructions,
    input: history.slice(-20).map((m) => ({
      role: m.role === "visitor" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    })),
  });
  let text = "";
  const r = res as unknown as { output_text?: string; output?: Array<{ type: string; content?: Array<{ type: string; text?: string }> }> };
  if (typeof r.output_text === "string") text = r.output_text;
  else for (const o of r.output ?? []) if (o.type === "message") for (const c of o.content ?? []) if (c.type === "output_text" && c.text) text += c.text;
  const handoff = text.includes("[SPECIALISTAS]");
  text = text.replace("[SPECIALISTAS]", "").trim() || "Atsiprašau, šiuo metu negaliu atsakyti. Sujungsiu jus su SGO specialistu.";
  return { text, handoff };
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function notifyHandoff(o: { sessionId: string; lastMessage: string; name: string; email: string; origin: string }) {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const resendKey = process.env["RESEND_API_KEY"];
  if (!lovableKey || !resendKey) { console.error("Chat notify skipped: missing keys"); return; }
  const link = `${o.origin}/admin/chat?s=${o.sessionId}`;
  const who = [o.name, o.email].filter(Boolean).join(" · ") || "Svetainės lankytojas";
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1a1a1a">
<h2 style="color:#0b1f17">Klientas laukia specialisto pokalbyje</h2>
<p><b>Klientas:</b> ${esc(who)}</p>
<p style="background:#f3f6f5;padding:12px;border-radius:8px">${esc(o.lastMessage)}</p>
<p><a href="${link}" style="display:inline-block;background:#1FB894;color:#052620;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold">Prisijungti prie pokalbio</a></p>
<p style="color:#666;font-size:13px">SGO valdymo sistema</p></div>`;
  const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": resendKey },
    body: JSON.stringify({ from: "SGO <info@sgo.lt>", to: [CHAT_NOTIFY_EMAIL], subject: "⚠️ Klientas laukia gyvo kontakto pokalbyje", html }),
  });
  if (!res.ok) console.error(`Chat notify failed [${res.status}]: ${await res.text()}`);
}
