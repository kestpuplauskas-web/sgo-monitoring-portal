import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { BarChart3, ExternalLink, Mail, FilePenLine, Inbox, LogOut, Tag, Users, UserCog, Menu, MessagesSquare, Handshake } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { canAccess, ROLE_LABELS, type Section } from "@/lib/admin-roles";
import { useMyRoles } from "@/lib/use-my-roles";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";

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
  const [menuOpen, setMenuOpen] = useState(false);
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

  const newInquiries = useQuery({
    queryKey: ["inquiries-new-count"],
    enabled: canAccess(roles, "inquiries"),
    refetchInterval: 60_000,
    queryFn: async () => {
      const { count } = await supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("status", "nauja");
      return count ?? 0;
    },
  });

  const waitingChats = useQuery({
    queryKey: ["chat-waiting-count"],
    enabled: canAccess(roles, "chat"),
    refetchInterval: 30_000,
    queryFn: async () => {
      const { count } = await supabase.from("chat_sessions").select("id", { count: "exact", head: true }).eq("status", "waiting");
      return count ?? 0;
    },
  });
  const pendingPartners = useQuery({
    queryKey: ["partners-pending-count"],
    enabled: canAccess(roles, "partners"),
    refetchInterval: 60_000,
    queryFn: async () => {
      const { count } = await supabase.from("partners").select("id", { count: "exact", head: true }).eq("status", "laukiama");
      return count ?? 0;
    },
  });
  useChatAlerts(canAccess(roles, "chat"), () => {
    qc.invalidateQueries({ queryKey: ["chat-waiting-count"] });
    qc.invalidateQueries({ queryKey: ["chat-sessions"] });
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
  if (roles.length > 0 && roles.every((r) => r === "partner")) {
    if (typeof window !== "undefined") window.location.replace("/partner/portalas");
    return <main className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Nukreipiama į partnerio aplinką…</main>;
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

  const navigation = <>
        <nav aria-label="Administravimo meniu" onClick={(e) => { if ((e.target as HTMLElement).closest("a")) setMenuOpen(false); }} className="mt-7 grid gap-6 lg:flex-1 lg:content-start">
          {show("orders") || show("clients") || show("analytics") ? (
            <NavGroup label="Darbo sritis">
              {show("orders") ? (
                <NavItem to="/admin/uzsakymai" icon={<Inbox className="h-4 w-4" />} badge={newOrders.data}>Planų užsakymai</NavItem>
              ) : null}
              {show("chat") ? <NavItem to="/admin/chat" icon={<MessagesSquare className="h-4 w-4" />} badge={waitingChats.data}>Chat komunikacija</NavItem> : null}
              {show("inquiries") ? <NavItem to="/admin/uzklausos" icon={<Mail className="h-4 w-4" />} badge={newInquiries.data}>Klientų užklausos</NavItem> : null}
              {show("clients") ? <NavItem to="/admin/klientai" icon={<Users className="h-4 w-4" />}>Klientų registras</NavItem> : null}
              {show("analytics") ? <NavItem to="/admin/analitika" icon={<BarChart3 className="h-4 w-4" />}>Puslapio analitika</NavItem> : null}
            </NavGroup>
          ) : null}
          {show("pricing") || show("articles") || show("partners") ? (
            <NavGroup label="Valdymas">
              {show("partners") ? <NavItem to="/admin/partneriai" icon={<Handshake className="h-4 w-4" />} badge={pendingPartners.data}>Partneriai (rangovai)</NavItem> : null}
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
              className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              Svetainė
            </a>
          </NavGroup>
        </nav>

        <div className="mt-8 border-t border-sidebar-border px-2 pt-4">
          <p className="truncate text-sm">{me.data?.email}</p>
          <p className="text-xs text-muted-foreground">{roles.map((r) => ROLE_LABELS[r]).join(", ")}</p>
          <Button variant="outline"
            onClick={signOut}
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm hover:border-primary"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" /> Atsijungti
          </Button>
        </div>
  </>;

  return (
    <div className="admin-panel min-h-dvh bg-background lg:flex">
      <header className="sticky top-0 z-30 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-sidebar-border bg-sidebar px-4 py-3 lg:hidden">
        <Link to="/admin" className="flex min-w-0 items-center gap-2" aria-label="SGO administravimas"><img src="/assets/sgo-logo-mark.webp" alt="" className="h-7 w-7 shrink-0" /><img src="/assets/sgo-logo-sgo.webp" alt="SGO" className="h-5 w-auto" /><span className="ml-2 border-l border-border pl-3 text-xs text-muted-foreground">Administravimas</span></Link>
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild><Button variant="outline" size="icon" className="h-11 w-11" aria-label="Atidaryti meniu"><Menu className="h-5 w-5" /></Button></SheetTrigger>
          <SheetContent side="left" className="admin-panel flex w-[min(88vw,360px)] flex-col overflow-y-auto bg-sidebar p-5">
            <SheetTitle className="pr-12 text-left">SGO administravimas</SheetTitle>
            <SheetDescription className="sr-only">Administravimo skyriai ir paskyra</SheetDescription>
            {navigation}
          </SheetContent>
        </Sheet>
      </header>
      <aside className="hidden border-b border-sidebar-border bg-sidebar px-4 py-5 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r lg:px-4 lg:py-6">
        <Link to="/admin" className="flex items-center gap-2 px-2">
          <img src="/assets/sgo-logo-mark.webp" alt="" className="h-8 w-8" />
          <img src="/assets/sgo-logo-sgo.webp" alt="SGO" className="h-6 w-auto" />
        </Link>
        <p className="mt-2 px-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">Valdymo sistema</p>

        {navigation}
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

function NavItem({ to, icon, badge, children }: { to: string; icon: ReactNode; badge?: number | undefined; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
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

function playDing() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.value = f; o.connect(g); g.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.18;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.start(t); o.stop(t + 0.4);
    });
  } catch { /* sound unavailable */ }
}

function useChatAlerts(enabled: boolean, onChange: () => void) {
  const cb = useRef(onChange);
  cb.current = onChange;
  useEffect(() => {
    if (!enabled) return;
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission().catch(() => {});
    const ch = supabase
      .channel(`chat-alerts-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_sessions" }, (p) => {
        cb.current();
        const n = p.new as { id: string; status: string; visitor_name: string; last_message: string };
        const o = p.old as { status?: string };
        if (n.status === "waiting" && o.status !== "waiting") {
          playDing();
          toast.warning("Klientas prašo specialisto pokalbyje", { action: { label: "Atidaryti", onClick: () => { window.location.href = `/admin/chat?s=${n.id}`; } } });
          if ("Notification" in window && Notification.permission === "granted") {
            const notif = new Notification("Klientas laukia pokalbyje", { body: n.last_message.slice(0, 120), icon: "/favicon.png" });
            notif.onclick = () => { window.focus(); window.location.href = `/admin/chat?s=${n.id}`; };
          }
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_sessions" }, () => cb.current())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [enabled]);
}
