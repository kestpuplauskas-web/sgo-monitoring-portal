import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Empty, PageBody, PageHeader, Panel, Stat } from "@/components/admin/ui";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/analitika")({
  head: () => ({ meta: [
    { title: "Puslapio analitika | SGO administravimas" },
    { name: "description", content: "Puslapio analitika SGO valdymo sistemoje." },
    { property: "og:title", content: "Puslapio analitika | SGO" },
    { property: "og:description", content: "Puslapio analitika SGO valdymo sistemoje." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: AnalyticsPage,
});

const PAGE_NAMES: Record<string, string> = {
  "/": "Pagrindinis",
  "/monitoringas": "Monitoringas",
  "/diagnostika": "Diagnostika",
  "/servisas": "Servisas",
  "/straipsniai": "Straipsniai",
};

function niceSource(ref: string) {
  if (!ref) return "Tiesioginis / nežinomas";
  try {
    const h = new URL(ref).hostname.replace(/^www\./, "");
    if (/google\./.test(h)) return "Google";
    if (/facebook|fb\.|messenger/.test(h)) return "Facebook";
    if (/instagram/.test(h)) return "Instagram";
    if (/bing\./.test(h)) return "Bing";
    return h;
  } catch {
    return "Kita";
  }
}

function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const since = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (days - 1));
    return d;
  }, [days]);

  const data = useQuery({
    queryKey: ["analytics", days],
    queryFn: async () => {
      const rows: { path: string; referrer: string; visitor_id: string; device: string; created_at: string }[] = [];
      for (let from = 0; from < 50000; from += 1000) {
        const { data, error } = await supabase
          .from("page_views")
          .select("path,referrer,visitor_id,device,created_at")
          .gte("created_at", since.toISOString())
          .order("created_at")
          .range(from, from + 999);
        if (error) throw error;
        rows.push(...(data ?? []));
        if (!data || data.length < 1000) break;
      }
      const { count } = await supabase.from("plan_orders").select("id", { count: "exact", head: true }).gte("created_at", since.toISOString());
      return { rows, orders: count ?? 0 };
    },
  });

  const s = useMemo(() => {
    const rows = data.data?.rows ?? [];
    const visitors = new Set(rows.map((r) => r.visitor_id || r.created_at)).size;
    const byDay = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      byDay.set(d.toISOString().slice(0, 10), 0);
    }
    const pages = new Map<string, number>();
    const sources = new Map<string, number>();
    const devices = new Map<string, number>();
    for (const r of rows) {
      const day = new Date(r.created_at);
      const key = new Date(day.getTime() - day.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      byDay.set(key, (byDay.get(key) ?? 0) + 1);
      const p = r.path.replace(/\/$/, "") || "/";
      pages.set(p, (pages.get(p) ?? 0) + 1);
      const src = niceSource(r.referrer);
      sources.set(src, (sources.get(src) ?? 0) + 1);
      devices.set(r.device || "Kita", (devices.get(r.device || "Kita") ?? 0) + 1);
    }
    const sort = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    return { views: rows.length, visitors, byDay: [...byDay.entries()], pages: sort(pages), sources: sort(sources), devices: sort(devices) };
  }, [data.data, days, since]);

  const orders = data.data?.orders ?? 0;
  const conv = s.visitors ? ((orders / s.visitors) * 100).toFixed(1).replace(".", ",") + " %" : "—";
  const max = Math.max(1, ...s.byDay.map(([, v]) => v));

  return (
    <>
      <PageHeader
        title="Puslapio analitika"
        description="Kiek žmonių lankosi sgo.lt, iš kur jie ateina ir kiek iš jų užsako planą."
        actions={
          <div className="flex rounded-full border border-border p-1" role="group" aria-label="Laikotarpis">
            {[7, 30, 90].map((d) => (
              <Button variant="ghost"
                key={d}
                onClick={() => setDays(d)}
                aria-pressed={days === d}
                className={cn("min-h-11 rounded-full px-4 text-sm", days === d ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                {d} d.
              </Button>
            ))}
          </div>
        }
      />
      <PageBody className="grid gap-6">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Stat label="Lankytojai" value={data.isLoading ? "…" : s.visitors} hint="Unikalūs per laikotarpį" />
          <Stat label="Peržiūros" value={data.isLoading ? "…" : s.views} hint="Atidaryti puslapiai" />
          <Stat label="Planų užsakymai" value={data.isLoading ? "…" : orders} />
          <Stat label="Konversija" value={data.isLoading ? "…" : conv} hint="Užsakymai / lankytojai" />
        </div>

        {data.isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : s.views === 0 ? (
          <Empty title="Duomenų dar nėra">Lankomumas pradedamas skaičiuoti nuo šiandien – duomenys atsiras, kai svetainėje apsilankys žmonės.</Empty>
        ) : (
          <>
            <Panel className="p-5">
              <p className="text-sm font-semibold">Peržiūros per dieną</p>
              <div className="mt-4 flex h-48 items-end gap-[3px]" role="img" aria-label="Peržiūrų per dieną grafikas">
                {s.byDay.map(([d, v]) => (
                  <div key={d} className="group relative min-w-0 flex-1">
                    <div className="w-full rounded-t bg-primary/70 group-hover:bg-primary" style={{ height: `${Math.max(2, (v / max) * 180)}px` }} />
                    <span className="pointer-events-none absolute -top-8 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-popover px-2 py-1 text-xs group-hover:block">
                      {d.slice(5).replace("-", "-")}: {v}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>{s.byDay[0]?.[0]}</span><span>{s.byDay.at(-1)?.[0]}</span>
              </div>
            </Panel>
            <div className="grid gap-4 lg:grid-cols-3">
              <TopList title="Populiariausi puslapiai" items={s.pages.map(([k, v]) => [PAGE_NAMES[k] ?? k, v])} />
              <TopList title="Iš kur ateina" items={s.sources} />
              <TopList title="Įrenginiai" items={s.devices} />
            </div>
          </>
        )}
      </PageBody>
    </>
  );
}

function TopList({ title, items }: { title: string; items: [string, number][] }) {
  const max = Math.max(1, ...items.map(([, v]) => v));
  return (
    <Panel className="p-5">
      <p className="text-sm font-semibold">{title}</p>
      <ul className="mt-4 grid gap-3">
        {items.map(([k, v]) => (
          <li key={k} className="text-sm">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2"><span className="truncate">{k}</span><span className="font-mono text-muted-foreground">{v}</span></div>
            <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(v / max) * 100}%` }} /></div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
