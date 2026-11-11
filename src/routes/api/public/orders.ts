import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { priceLabel } from "@/lib/plan-format";

const schema = z.object({
  plan_id: z.string().uuid(),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().regex(/^[+\d][\d\s()-]{6,29}$/),
  city: z.string().trim().min(2).max(150),
  inverter: z.string().trim().max(60).optional().default(""),
  hp: z.string().max(0).optional().default(""),
});

export const Route = createFileRoute("/api/public/orders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Neteisinga užklausa" }, { status: 400 });
        }
        const parsed = schema.safeParse(body);
        if (!parsed.success) {
          return Response.json({ error: "Patikrinkite užpildytus laukus" }, { status: 400 });
        }
        const d = parsed.data;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: plan } = await supabaseAdmin
          .from("plans")
          .select("id,name,price,old_price,period_label,active")
          .eq("id", d.plan_id)
          .maybeSingle();
        if (!plan || !plan.active) {
          return Response.json({ error: "Šis planas nebepasiekiamas" }, { status: 400 });
        }

        const email = d.email.toLowerCase();
        const { data: client } = await supabaseAdmin
          .from("clients")
          .upsert(
            { email, name: d.name, phone: d.phone, city: d.city, inverter: d.inverter },
            { onConflict: "email" },
          )
          .select("id")
          .single();

        const year = new Date().getFullYear();
        for (let i = 0; i < 5; i++) {
          const order_no = `SGO-${year}-${Math.floor(10000 + Math.random() * 90000)}`;
          const { error } = await supabaseAdmin.from("plan_orders").insert({
            order_no,
            plan_id: plan.id,
            plan_name: plan.name,
            price_label: priceLabel(plan),
            client_id: client?.id ?? null,
            name: d.name,
            email,
            phone: d.phone,
            city: d.city,
            inverter: d.inverter,
          });
          if (!error) {
            try {
              const { sendOrderConfirmation } = await import("@/lib/order-email.server");
              await sendOrderConfirmation({ to: email, name: d.name, order_no, plan_name: plan.name, price_label: priceLabel(plan) });
            } catch (e) {
              console.error("Order email error", e);
            }
            return Response.json({ order_no, plan_name: plan.name });
          }
          if (!String(error.message).includes("duplicate")) break;
        }
        return Response.json({ error: "Nepavyko išsaugoti užsakymo. Bandykite dar kartą." }, { status: 500 });
      },
    },
  },
});
