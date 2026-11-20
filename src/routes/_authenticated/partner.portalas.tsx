import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { LogOut, Plus, Trash2, Clock } from "lucide-react";
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

const empty = { name: "", phone: "", email: "", city: "", power: "", inverter: "", plan_id: "" };

function PortalPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [f, setF] = useState(empty);

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
  const refresh = () => qc.invalidateQueries({ queryKey: ["my-partner-clients"] });
  const planName = (id: string) => plans.data?.find((p) => p.id === id)?.name ?? "";

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("partner_clients").insert({
        partner_id: partner.data!.id, name: f.name.trim(), phone: f.phone.trim(), email: f.email.trim(), city: f.city.trim(),
        power: f.power.trim(), inverter: f.inverter.trim(), plan_id: f.plan_id || null, plan_name: planName(f.plan_id),
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

  async function signOut() {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/partner", replace: true });
  }

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
            <div className="grid min-w-0 content-start gap-3">
              {clients.isLoading ? <Skeleton className="h-24" /> : (clients.data ?? []).length === 0 ? (
                <Empty title="Klientų dar nėra">Pridėkite pirmąjį klientą formoje.</Empty>
              ) : clients.data!.map((c) => (
                <Panel key={c.id} className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="min-w-0">
                    <p className="font-display text-lg font-bold">{c.name}</p>
                    <p className="break-words text-sm text-muted-foreground">{[c.phone, c.email, c.city, c.power && `${c.power} kW`, c.inverter].filter(Boolean).join(" · ")}</p>
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
            </div>
            <Panel className="h-fit p-5">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Plus className="h-5 w-5 text-primary" />Pridėti klientą</h2>
              <form onSubmit={submit} className="mt-4 grid gap-3">
                <div className="grid gap-1.5"><Label htmlFor="cn">Vardas, pavardė / įmonė *</Label><Input id="cn" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
                <div className="grid gap-1.5"><Label htmlFor="cp">Telefonas *</Label><Input id="cp" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
                <div className="grid gap-1.5"><Label htmlFor="ce">El. paštas</Label><Input id="ce" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
                <div className="grid gap-1.5"><Label htmlFor="cc">Elektrinės vieta (miestas) *</Label><Input id="cc" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></div>
                <div className="grid gap-1.5"><Label htmlFor="cw">Galia, kW</Label><Input id="cw" inputMode="decimal" value={f.power} onChange={(e) => setF({ ...f, power: e.target.value })} /></div>
                <div className="grid gap-1.5"><Label htmlFor="ci">Inverteris</Label><Input id="ci" value={f.inverter} onChange={(e) => setF({ ...f, inverter: e.target.value })} /></div>
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
          </PageBody>
        </>
      )}
    </div>
  );
}
