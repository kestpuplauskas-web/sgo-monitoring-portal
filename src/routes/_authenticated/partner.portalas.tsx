import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { LogOut, Plus, Trash2, Clock, Search, Wrench, Upload, Users, Zap, ShieldCheck, AlertTriangle, Phone } from "lucide-react";
import { clientStatusLabel, REQUEST_STATUSES } from "@/lib/partner-status";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Empty, PageBody, PageHeader, Panel } from "@/components/admin/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/partner/portalas")({
  head: () => ({ meta: [
    { title: "Partnerio aplinka | SGO" },
    { name: "description", content: "SGO partnerio aplinka: jūsų klientai ir jų SGO planai." },
    { property: "og:title", content: "Partnerio aplinka | SGO" },
    { property: "og:description", content: "SGO partnerio aplinka." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: PortalPage,
});

const empty = { name: "", phone: "", email: "", city: "", address: "", power: "", inverter: "", serial_no: "", logger_id: "", installed_on: "", warranty_until: "", plan_id: "" };

function parseCsv(text: string) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const sep = lines[0]!.includes(";") ? ";" : ",";
  const head = lines[0]!.split(sep).map((h) => h.trim().toLowerCase());
  const idx = (...k: string[]) => head.findIndex((h) => k.some((x) => h.includes(x)));
  const m = { name: idx("vard", "name", "įmon"), phone: idx("tel", "phone"), email: idx("paštas", "email", "el."), city: idx("miest", "city"), address: idx("adres", "address"), power: idx("galia", "kw", "power"), inverter: idx("inverter"), serial_no: idx("s/n", "serij", "serial") };
  return lines.slice(1).map((l) => { const c = l.split(sep).map((x) => x.trim().replace(/^"|"$/g, "")); const g = (i: number) => (i >= 0 ? c[i] ?? "" : ""); return { name: g(m.name), phone: g(m.phone), email: g(m.email), city: g(m.city), address: g(m.address), power: g(m.power), inverter: g(m.inverter), serial_no: g(m.serial_no) }; }).filter((r) => r.name);
}

function PortalPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [f, setF] = useState(empty);
  const [q, setQ] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [svc, setSvc] = useState<{ client_id: string; kind: string; description: string }>({ client_id: "", kind: "gedimas", description: "" });

  const partner = useQuery({
    queryKey: ["my-partner"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("partners").select("*").eq("user_id", u.user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const active = partner.data?.status === "aktyvus";
  const plans = useQuery({
    queryKey: ["plans-public"],
    queryFn: async () => (await supabase.from("plans").select("id,name,price,period_label").eq("active", true).order("sort_order")).data ?? [],
  });
  const clients = useQuery({
    queryKey: ["my-partner-clients"],
    enabled: active,
    queryFn: async () => {
      const { data, error } = await supabase.from("partner_clients").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const requests = useQuery({
    queryKey: ["my-partner-requests"],
    enabled: active,
    queryFn: async () => {
      const { data, error } = await supabase.from("partner_service_requests").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["my-partner-clients"] });
  const planName = (id: string) => plans.data?.find((p) => p.id === id)?.name ?? "";

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("partner_clients").insert({
        partner_id: partner.data!.id, name: f.name.trim(), phone: f.phone.trim(), email: f.email.trim(), city: f.city.trim(),
        power: f.power.trim(), inverter: f.inverter.trim(), address: f.address.trim(), serial_no: f.serial_no.trim(), logger_id: f.logger_id.trim(),
        installed_on: f.installed_on || null, warranty_until: f.warranty_until || null, plan_id: f.plan_id || null, plan_name: planName(f.plan_id),
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Klientas pridėtas"); setF(empty); refresh(); },
    onError: () => toast.error("Nepavyko pridėti kliento"),
  });
  const setPlan = useMutation({
    mutationFn: async (v: { id: string; plan_id: string }) => {
      const { error } = await supabase.from("partner_clients").update({ plan_id: v.plan_id, plan_name: planName(v.plan_id) }).eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Planas priskirtas"); refresh(); },
    onError: () => toast.error("Nepavyko pakeisti plano"),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("partner_clients").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Klientas pašalintas"); refresh(); },
    onError: () => toast.error("Nepavyko pašalinti"),
  });

  const addReq = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("partner_service_requests").insert({ partner_id: partner.data!.id, client_id: svc.client_id, kind: svc.kind, description: svc.description.trim() });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Užklausa išsiųsta SGO komandai"); setSvc({ client_id: "", kind: "gedimas", description: "" }); qc.invalidateQueries({ queryKey: ["my-partner-requests"] }); },
    onError: () => toast.error("Nepavyko išsiųsti užklausos"),
  });
  const importCsv = useMutation({
    mutationFn: async (file: File) => {
      const rows = parseCsv(await file.text());
      if (!rows.length) throw new Error("Faile neradome klientų. Pirmoje eilutėje turi būti stulpelių pavadinimai (Vardas; Telefonas; Miestas...).");
      const { error } = await supabase.from("partner_clients").insert(rows.map((r) => ({ ...r, partner_id: partner.data!.id })));
      if (error) throw new Error("Nepavyko importuoti klientų");
      return rows.length;
    },
    onSuccess: (n) => { toast.success(`Importuota klientų: ${n}`); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  async function signOut() {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/partner", replace: true });
  }

  const all = clients.data ?? [];
  const totalKw = all.reduce((n, c) => n + (parseFloat(String(c.power).replace(",", ".")) || 0), 0);
  const alerts = all.filter((c) => c.status === "ispejimas");
  const ql = q.trim().toLowerCase();
  const shown = all.filter((c) => (!ql || [c.name, c.phone, c.city, c.address].some((x) => x.toLowerCase().includes(ql))) && (planFilter === "all" || (planFilter === "none" ? !c.plan_id : c.plan_id === planFilter)));
  const valid = f.name.trim() && f.phone.trim() && f.city.trim() && !add.isPending;
  function submit(e: FormEvent) { e.preventDefault(); if (valid) add.mutate(); }

  return (
    <div className="admin-panel min-h-dvh bg-background">
      <header className="flex items-center justify-between gap-3 border-b border-sidebar-border bg-sidebar px-4 py-3 sm:px-8">
        <a href="/" className="flex items-center gap-2" aria-label="SGO pradžia"><img src="/assets/sgo-logo-mark.webp" alt="" className="h-7 w-7" /><img src="/assets/sgo-logo-sgo.webp" alt="SGO" className="h-5 w-auto" /><span className="ml-2 border-l border-border pl-3 text-xs text-muted-foreground">Partnerio aplinka</span></a>
        <Button variant="outline" className="h-11 rounded-full" onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Atsijungti</Button>
      </header>
      {partner.isLoading ? (
        <PageBody><Skeleton className="h-40" /></PageBody>
      ) : !partner.data ? (
        <PageBody><Empty title="Ši paskyra nėra partnerio paskyra">Registruokitės adresu <a className="text-primary underline" href="/partner">sgo.lt/partner</a> arba paprašykite SGO kvietimo.</Empty></PageBody>
      ) : !active ? (
        <PageBody>
          <Empty title={partner.data.status === "sustabdytas" ? "Partnerystė sustabdyta" : "Laukiama SGO patvirtinimo"}>
            <Clock className="mx-auto mb-2 h-8 w-8 text-primary" />
            {partner.data.status === "sustabdytas" ? "Susisiekite su SGO: +370 606 06222, info@sgo.lt." : "Jūsų registracija gauta. Kai SGO administratorius ją patvirtins, galėsite pridėti klientus."}
          </Empty>
        </PageBody>
      ) : (
        <>
          <PageHeader title={partner.data.company || "Mano klientai"} description="Pridėkite savo klientus ir parinkite jiems SGO priežiūros planą. SGO komanda mato šį sąrašą ir susisieks dėl aktyvavimo." />
          <PageBody className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="grid min-w-0 content-start gap-4">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  { icon: Users, label: "Klientai", value: all.length },
                  { icon: Zap, label: "Bendra galia", value: `${totalKw.toLocaleString("lt-LT", { maximumFractionDigits: 1 })} kW` },
                  { icon: ShieldCheck, label: "Su SGO planu", value: all.filter((c) => c.plan_id).length },
                  { icon: AlertTriangle, label: "Pastebėtos klaidos", value: alerts.length },
                ].map((k) => (
                  <Panel key={k.label} className="p-4"><k.icon className="h-5 w-5 text-primary" /><p className="mt-2 font-display text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></Panel>
                ))}
              </div>
              {alerts.length > 0 ? (
                <Panel className="border-destructive/40 p-4">
                  <h2 className="flex items-center gap-2 font-display text-base font-bold"><AlertTriangle className="h-5 w-5 text-destructive" />Pranešimai apie klaidas</h2>
                  <ul className="mt-2 grid gap-1 text-sm">{alerts.map((c) => <li key={c.id}>Pastebėta klaida: <b>{c.name}</b>{c.city ? `, ${c.city}` : ""}. Užregistruokite apžiūrą žemiau.</li>)}</ul>
                </Panel>
              ) : null}
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="h-11 pl-9" placeholder="Ieškoti pagal vardą, telefoną ar miestą" aria-label="Paieška" value={q} onChange={(e) => setQ(e.target.value)} /></div>
                <Select value={planFilter} onValueChange={setPlanFilter}>
                  <SelectTrigger className="h-11 sm:w-[200px]" aria-label="Filtras pagal planą"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">Visi planai</SelectItem><SelectItem value="none">Be plano</SelectItem>{(plans.data ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
                <Button variant="outline" className="h-11" asChild>
                  <label className="cursor-pointer"><Upload className="mr-2 h-4 w-4" />{importCsv.isPending ? "Importuojama…" : "Importuoti CSV"}<input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; if (file) importCsv.mutate(file); e.target.value = ""; }} /></label>
                </Button>
              </div>
              <p className="-mt-2 text-xs text-muted-foreground">CSV failą išsaugokite iš Excel („Išsaugoti kaip → CSV“). Stulpeliai: Vardas; Telefonas; El. paštas; Miestas; Adresas; Galia; Inverteris; S/N.</p>
              {clients.isLoading ? <Skeleton className="h-24" /> : all.length === 0 ? (
                <Empty title="Klientų dar nėra">Pridėkite pirmąjį klientą formoje arba importuokite sąrašą.</Empty>
              ) : shown.length === 0 ? <Empty title="Nieko nerasta">Pakeiskite paiešką ar filtrą.</Empty> : shown.map((c) => (
                <Panel key={c.id} className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><p className="font-display text-lg font-bold">{c.name}</p><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.status === "ispejimas" ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"}`}>{clientStatusLabel(c.status)}</span></div>
                    <p className="break-words text-sm text-muted-foreground">{[c.phone, c.email, c.address || c.city, c.power && `${c.power} kW`, c.inverter].filter(Boolean).join(" · ")}</p>
                    <p className="break-words text-xs text-muted-foreground">{[c.serial_no && `S/N ${c.serial_no}`, c.logger_id && `Stebėsenos ID ${c.logger_id}`, c.installed_on && `Įrengta ${c.installed_on}`, c.warranty_until && `Garantija iki ${c.warranty_until}`].filter(Boolean).join(" · ")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={c.plan_id ?? ""} onValueChange={(v) => setPlan.mutate({ id: c.id, plan_id: v })}>
                      <SelectTrigger className="h-11 w-[200px]" aria-label="SGO planas"><SelectValue placeholder="Parinkti planą" /></SelectTrigger>
                      <SelectContent>{(plans.data ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.name} — {p.price} € {p.period_label}</SelectItem>)}</SelectContent>
                    </Select>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="outline" size="icon" className="h-11 w-11" aria-label={`Pašalinti ${c.name}`}><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Pašalinti klientą?</AlertDialogTitle><AlertDialogDescription>{c.name} bus pašalintas iš jūsų sąrašo.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Atšaukti</AlertDialogCancel><AlertDialogAction onClick={() => del.mutate(c.id)}>Pašalinti</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </Panel>
              ))}
              <Panel className="p-5">
                <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Wrench className="h-5 w-5 text-primary" />Gedimai ir serviso užklausos</h2>
                <form className="mt-4 grid gap-3" onSubmit={(e) => { e.preventDefault(); if (svc.client_id && svc.description.trim()) addReq.mutate(); }}>
                  <div className="grid gap-1.5"><Label>Klientas *</Label>
                    <Select value={svc.client_id} onValueChange={(v) => setSvc({ ...svc, client_id: v })}><SelectTrigger className="h-11"><SelectValue placeholder="Pasirinkite klientą" /></SelectTrigger><SelectContent>{all.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}{c.city ? ` (${c.city})` : ""}</SelectItem>)}</SelectContent></Select>
                  </div>
                  <div className="grid gap-1.5"><Label>Tipas</Label>
                    <Select value={svc.kind} onValueChange={(v) => setSvc({ ...svc, kind: v })}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="gedimas">Gedimas</SelectItem><SelectItem value="apziura">Apžiūra / diagnostika</SelectItem><SelectItem value="kita">Kita</SelectItem></SelectContent></Select>
                  </div>
                  <div className="grid gap-1.5"><Label htmlFor="sd">Aprašymas *</Label><Textarea id="sd" rows={3} placeholder="Pvz., inverteris rodo klaidą, generacija nukrito" value={svc.description} onChange={(e) => setSvc({ ...svc, description: e.target.value })} /></div>
                  <Button type="submit" className="h-11" disabled={!svc.client_id || !svc.description.trim() || addReq.isPending}>{addReq.isPending ? "Siunčiama…" : "Registruoti užklausą"}</Button>
                </form>
                <div className="mt-5 grid gap-2">
                  {(requests.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Darbų istorija tuščia.</p> : requests.data!.map((r) => (
                    <div key={r.id} className="rounded-md bg-muted/40 p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2"><b>{all.find((c) => c.id === r.client_id)?.name ?? "Klientas"} · {r.kind === "gedimas" ? "Gedimas" : r.kind === "apziura" ? "Apžiūra" : "Kita"}</b><span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">{REQUEST_STATUSES[r.status] ?? r.status}</span></div>
                      <p className="mt-1 text-muted-foreground">{r.description}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("lt-LT")}</p>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
            <div className="grid h-fit gap-4">
            <Panel className="p-5">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Phone className="h-5 w-5 text-primary" />SGO palaikymas</h2>
              <p className="mt-2 text-sm text-muted-foreground">Klausimai dėl klientų, planų ar gedimų:</p>
              <p className="mt-2 text-sm"><a className="font-semibold text-primary" href="tel:+37060606222">+370 606 06222</a><br /><a className="font-semibold text-primary" href="mailto:info@sgo.lt">info@sgo.lt</a></p>
            </Panel>
            <Panel className="p-5">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Plus className="h-5 w-5 text-primary" />Pridėti klientą</h2>
              <form onSubmit={submit} className="mt-4 grid gap-3">
                <div className="grid gap-1.5"><Label htmlFor="cn">Vardas, pavardė / įmonė *</Label><Input id="cn" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
                <div className="grid gap-1.5"><Label htmlFor="cp">Telefonas *</Label><Input id="cp" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
                <div className="grid gap-1.5"><Label htmlFor="ce">El. paštas</Label><Input id="ce" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
                <div className="grid gap-1.5"><Label htmlFor="cc">Elektrinės vieta (miestas) *</Label><Input id="cc" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></div>
                <div className="grid gap-1.5"><Label htmlFor="ca">Tikslus adresas</Label><Input id="ca" autoComplete="street-address" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
                <div className="grid gap-1.5"><Label htmlFor="cw">Galia, kW</Label><Input id="cw" inputMode="decimal" value={f.power} onChange={(e) => setF({ ...f, power: e.target.value })} /></div>
                <div className="grid gap-1.5"><Label htmlFor="ci">Inverteris</Label><Input id="ci" value={f.inverter} onChange={(e) => setF({ ...f, inverter: e.target.value })} /></div>
                <div className="grid gap-1.5"><Label htmlFor="cs">Inverterio serijos nr. (S/N)</Label><Input id="cs" value={f.serial_no} onChange={(e) => setF({ ...f, serial_no: e.target.value })} /></div>
                <div className="grid gap-1.5"><Label htmlFor="cl">Stebėsenos ID (Dongle / Logger)</Label><Input id="cl" value={f.logger_id} onChange={(e) => setF({ ...f, logger_id: e.target.value })} /></div>
                <div className="grid gap-1.5"><Label htmlFor="cd">Įrengimo data</Label><Input id="cd" type="date" value={f.installed_on} onChange={(e) => setF({ ...f, installed_on: e.target.value })} /></div>
                <div className="grid gap-1.5"><Label htmlFor="cg">Rangovo garantija iki</Label><Input id="cg" type="date" value={f.warranty_until} onChange={(e) => setF({ ...f, warranty_until: e.target.value })} /></div>
                <div className="grid gap-1.5">
                  <Label>SGO planas</Label>
                  <Select value={f.plan_id} onValueChange={(v) => setF({ ...f, plan_id: v })}>
                    <SelectTrigger className="h-11"><SelectValue placeholder="Parinkti planą" /></SelectTrigger>
                    <SelectContent>{(plans.data ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.name} — {p.price} € {p.period_label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="h-11" disabled={!valid}>{add.isPending ? "Saugoma…" : "Pridėti klientą"}</Button>
              </form>
            </Panel>
            </div>
          </PageBody>
        </>
      )}
    </div>
  );
}
