import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ROLES = ["admin", "manager", "editor"] as const;

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Šis veiksmas leidžiamas tik administratoriui");
}

export const listStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id,role");
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    const byUser = new Map<string, string[]>();
    for (const r of roles ?? []) byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r.role]);
    return (list?.users ?? [])
      .filter((u) => (byUser.get(u.id) ?? []).some((r) => r !== "partner"))
      .map((u) => ({
        id: u.id,
        email: u.email ?? "",
        name: ((u.user_metadata as { full_name?: string } | null)?.full_name ?? "").trim(),
        roles: byUser.get(u.id) ?? [],
        invited: !u.last_sign_in_at,
        lastSignIn: u.last_sign_in_at ?? null,
        isMe: u.id === context.userId,
      }));
  });

export const inviteStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        email: z.string().trim().email().max(255),
        name: z.string().trim().max(100).default(""),
        role: z.enum(ROLES),
        redirectTo: z.string().url(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();
    let userId: string | undefined;
    const { data: inv, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: data.redirectTo,
      data: { full_name: data.name },
    });
    if (inv?.user) userId = inv.user.id;
    if (error) {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
      userId = list?.users.find((u) => u.email?.toLowerCase() === email)?.id;
      if (!userId) throw new Error("Nepavyko išsiųsti kvietimo. Patikrinkite el. pašto adresą.");
    }
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId!);
    await supabaseAdmin.from("user_roles").insert({ user_id: userId!, role: data.role });
    return { ok: true };
  });

export const setStaffRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ userId: z.string().uuid(), role: z.enum(ROLES) }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId && data.role !== "admin") {
      throw new Error("Negalite atimti administratoriaus teisių patys sau");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: data.role });
    return { ok: true };
  });

export const removeStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ userId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("Negalite pašalinti savęs");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    return { ok: true };
  });

export const invitePartner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({
      email: z.string().trim().email().max(255),
      company: z.string().trim().min(1).max(200),
      contact_name: z.string().trim().max(100).default(""),
      phone: z.string().trim().max(30).default(""),
      redirectTo: z.string().url(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: ok } = await context.supabase.rpc("has_any_role", { _user_id: context.userId, _roles: ["admin", "manager"] });
    if (!ok) throw new Error("Neturite teisės kviesti partnerių");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();
    let userId: string | undefined;
    const { data: inv, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: data.redirectTo,
      data: { full_name: data.contact_name },
    });
    if (inv?.user) userId = inv.user.id;
    if (error) {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
      userId = list?.users.find((u) => u.email?.toLowerCase() === email)?.id;
      if (!userId) throw new Error("Nepavyko išsiųsti kvietimo. Patikrinkite el. pašto adresą.");
      // Account already exists: Auth won't send an invite, so send our own sign-in link.
      const { data: link, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo: "https://sgo.lt/partner" },
      });
      if (linkErr || !link?.properties?.action_link) throw new Error("Nepavyko sukurti prisijungimo nuorodos");
      const { sendPartnerAccessEmail } = await import("@/lib/order-email.server");
      await sendPartnerAccessEmail({ to: email, company: data.company, link: link.properties.action_link });
    }
    const { data: existing } = await supabaseAdmin.from("partners").select("id").eq("user_id", userId!).maybeSingle();
    if (existing) await supabaseAdmin.from("partners").update({ status: "aktyvus", company: data.company }).eq("id", existing.id);
    else await supabaseAdmin.from("partners").insert({ user_id: userId!, email, company: data.company, contact_name: data.contact_name, phone: data.phone, status: "aktyvus" });
    const { data: hasRole } = await supabaseAdmin.from("user_roles").select("id").eq("user_id", userId!).eq("role", "partner").maybeSingle();
    if (!hasRole) await supabaseAdmin.from("user_roles").insert({ user_id: userId!, role: "partner" });
    return { ok: true };
  });
