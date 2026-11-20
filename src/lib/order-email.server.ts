const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function sendOrderConfirmation(o: {
  to: string; name: string; order_no: string; plan_name: string; price_label: string;
}) {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const resendKey = process.env["RESEND_API_KEY"];
  if (!lovableKey || !resendKey) {
    console.error("Order email skipped: missing LOVABLE_API_KEY or RESEND_API_KEY");
    return;
  }
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1a1a1a">
<h2 style="color:#0b1f17">Ačiū, ${esc(o.name)}! Jūsų planas užsakytas</h2>
<p>Gavome jūsų užsakymą. Netrukus su jumis susisieksime dėl aktyvavimo.</p>
<table style="border-collapse:collapse;width:100%;margin:16px 0">
<tr><td style="padding:8px;border-bottom:1px solid #eee">Užsakymo nr.</td><td style="padding:8px;border-bottom:1px solid #eee"><b>${esc(o.order_no)}</b></td></tr>
<tr><td style="padding:8px;border-bottom:1px solid #eee">Planas</td><td style="padding:8px;border-bottom:1px solid #eee"><b>${esc(o.plan_name)}</b></td></tr>
<tr><td style="padding:8px;border-bottom:1px solid #eee">Kaina</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(o.price_label)}</td></tr>
</table>
<p><b>Kas toliau?</b><br>1. Susisieksime per 1 darbo dieną.<br>2. Prijungsime jūsų elektrinę prie stebėsenos.<br>3. Gausite prieigą ir pirmą ataskaitą.</p>
<p>Klausimai? Tiesiog atsakykite į šį laišką.</p>
<p style="color:#666;font-size:13px">SGO · info@sgo.lt · sgo.lt</p></div>`;
  const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": resendKey,
    },
    body: JSON.stringify({
      from: "SGO <info@sgo.lt>",
      to: [o.to],
      reply_to: "info@sgo.lt",
      subject: `Jūsų SGO planas „${o.plan_name}" užsakytas (${o.order_no})`,
      html,
    }),
  });
  if (!res.ok) console.error(`Order email failed [${res.status}]: ${await res.text()}`);
}

export async function sendPartnerAccessEmail(o: { to: string; company: string; link: string }) {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const resendKey = process.env["RESEND_API_KEY"];
  if (!lovableKey || !resendKey) throw new Error("Laiškų siuntimas nesukonfigūruotas");
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1a1a1a">
<h2 style="color:#0b1f17">Kvietimas į SGO partnerių aplinką</h2>
<p>${esc(o.company)} pakviesta tapti SGO partneriu (rangovu). Jūsų paskyra jau aktyvi.</p>
<p><a href="${esc(o.link)}" style="display:inline-block;background:#0b1f17;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Prisijungti prie partnerio aplinkos</a></p>
<p style="color:#666;font-size:13px">Nuoroda galioja ribotą laiką. Jei nebegalioja, prisijunkite adresu https://sgo.lt/partner.<br>SGO · info@sgo.lt · sgo.lt</p></div>`;
  const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": resendKey },
    body: JSON.stringify({ from: "SGO <info@sgo.lt>", to: [o.to], reply_to: "info@sgo.lt", subject: "Kvietimas į SGO partnerių aplinką", html }),
  });
  if (!res.ok) throw new Error(`Nepavyko išsiųsti laiško (${res.status})`);
}
