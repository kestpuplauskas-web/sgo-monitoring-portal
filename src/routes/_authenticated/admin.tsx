import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { BarChart3, ExternalLink, FilePenLine, Inbox, LogOut, Tag, Users, UserCog } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { canAccess, ROLE_LABELS, type Section } from "@/lib/admin-roles";
import { useMyRoles } from "@/lib/use-my-roles";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "SGO administravimas" },
      { name: "description", content: "SGO platformos valdymo sistema." },
      { property: "og:title", content: "SGO administravimas" },
      { property: "og:description", content: "SGO platformos valdymo sistema." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const me = useMyRoles();
  const roles = me.data?.roles ?? [];

  const newOrders = useQuery({
    queryKey: ["orders-new-count"],
    enabled: canAccess(roles, "orders"),
    refetchInterval: 60_000,
    queryFn: async () => {
      const { count } = await supabase.from("plan_orders").select("id", { count: "exact", head: true }).eq("status", "nauja");
      return count ?? 0;
    },
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/admin/prisijungimas", replace: true });
  }

  if (me.isLoading) {
    return <main className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Kraunama…</main>;
  }
  if (me.isError) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="font-display text-xl font-bold">Nepavyko patikrinti teisių</p>
        <button className="text-sm text-primary underline" onClick={() => me.refetch()}>Bandyti dar kartą</button>
      </main>
    );
  }
  if (roles.length === 0) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="font-display text-2xl font-bold">Neturite prieigos teisių</p>
        <p className="max-w-sm text-sm text-muted-foreground">Paprašykite SGO administratoriaus pakviesti jus ir suteikti rolę.</p>
        <button onClick={signOut} className="mt-2 text-sm text-primary underline">Atsijungti</button>
      </main>
    );
  }

  const show = (s: Section) => canAccess(roles, s);

  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside className="border-b border-sidebar-border bg-sidebar px-4 py-5 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r lg:px-4 lg:py-6">
        <Link to="/admin" className="flex items-center gap-2 px-2">
          <img src="/assets/sgo-logo-mark.webp" alt="" className="h-8 w-8" />
          <img src="/assets/sgo-logo-sgo.webp" alt="SGO" className="h-6 w-auto" />
        </Link>
        <p className="mt-2 px-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">Valdymo sistema</p>

        <nav aria-label="Administravimo meniu" className="mt-7 grid gap-6 sm:grid-cols-3 lg:flex-1 lg:grid-cols-1 lg:content-start">
          {show("orders") || show("clients") || show("analytics") ? (
            <NavGroup label="Darbo sritis">
              {show("orders") ? (
                <NavItem to="/admin/uzsakymai" icon={<Inbox className="h-4 w-4" />} badge={newOrders.data}>Planų užsakymai</NavItem>
              ) : null}
              {show("clients") ? <NavItem to="/admin/klientai" icon={<Users className="h-4 w-4" />}>Klientų registras</NavItem> : null}
              {show("analytics") ? <NavItem to="/admin/analitika" icon={<BarChart3 className="h-4 w-4" />}>Puslapio analitika</NavItem> : null}
            </NavGroup>
          ) : null}
          {show("pricing") || show("articles") ? (
            <NavGroup label="Valdymas">
              {show("pricing") ? <NavItem to="/admin/kainodara" icon={<Tag className="h-4 w-4" />}>Planų kainodara</NavItem> : null}
              {show("articles") ? <NavItem to="/admin/straipsniai" icon={<FilePenLine className="h-4 w-4" />}>Straipsniai</NavItem> : null}
            </NavGroup>
          ) : null}
          <NavGroup label="Nustatymai">
            {show("users") ? <NavItem to="/admin/vartotojai" icon={<UserCog className="h-4 w-4" />}>Vartotojai</NavItem> : null}
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              Svetainė
            </a>
          </NavGroup>
        </nav>

        <div className="mt-8 border-t border-sidebar-border px-2 pt-4">
          <p className="truncate text-sm">{me.data?.email}</p>
          <p className="text-xs text-muted-foreground">{roles.map((r) => ROLE_LABELS[r]).join(", ")}</p>
          <button
            onClick={signOut}
            className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-4 text-sm hover:border-primary"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" /> Atsijungti
          </button>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}

function NavGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="px-3 text-[11px] font-semibold uppercase text-muted-foreground">{label}</h2>
      <div className="mt-2 flex flex-col gap-1">{children}</div>
    </section>
  );
}

function NavItem({ to, icon, badge, children }: { to: string; icon: ReactNode; badge?: number; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
      activeProps={{ className: "bg-sidebar-accent font-semibold !text-sidebar-accent-foreground" }}
    >
      <span aria-hidden="true" className="text-primary">{icon}</span>
      <span className="flex-1">{children}</span>
      {badge ? (
        <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground" aria-label={`${badge} naujų`}>
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
