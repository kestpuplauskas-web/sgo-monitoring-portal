import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ChevronDown, Handshake } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { invitePartner } from "@/lib/users.functions";
import { PARTNER_STATUSES, canAccess } from "@/lib/admin-roles";
import { useMyRoles } from "@/lib/use-my-roles";
import { Empty, PageBody, PageHeader, Panel, Stat, ltDate } from "@/components/admin/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/partneriai")({
  head: () => ({ meta: [
    { title: "Partneriai | SGO administravimas" },
    { name: "description", content: "SGO partnerių (rangovų) registras ir jiems priskirti klientai." },
    { property: "og:title", content: "Partneriai | SGO" },
    { property: "og:description", content: "SGO partnerių (rangovų) registras." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: PartnersPage,
});

const statusClass: Record<string, string> = {
  laukiama: "bg-warning/15 text-warning",
  aktyvus: "bg-chart-2/20 text-chart-2",
  sustabdytas: "bg-destructive/15 text-destructive",
};
const statusLabel = (s: string) => PARTNER_STATUSES.find((x) => x.value === s)?.label ?? s;

function PartnersPage() {
  const me = useMyRoles();
  const allowed = canAccess(me.data?.roles ?? [], "partners");
  const qc = useQueryClient();
  const invite = useServerFn(invitePartner);
  const [open, setOpen] = useState<string | null>(null);
  const [f, setF] = useState({ email: "", company: "", contact_name: "", phone: "" });

  const partners = useQuery({
    queryKey: ["partners"],
    enabled: allowed,
    queryFn: async () => {
      const { data, error } = await supabase.from("partners").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const clients = useQuery({
    queryKey: ["partner-clients-all"],
    enabled: allowed,
    queryFn: async () => {
      const { data, error } = await supabase.from("partner_clients").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["partners"] });
    qc.invalidateQueries({ queryKey: ["partners-pending-count"] });
  };

  const setStatus = useMutation({
    mutationFn: async (v: { id: string; status: string }) => {
      const { error } = await supabase.from("partners").update({ status: v.status }).eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Statusas pakeistas"); refresh(); },
    onError: () => toast.error("Nepavyko pakeisti statuso"),
  });
  const inv = useMutation({
    mutationFn: () => invite({ data: { ...f, redirectTo: `${window.location.origin}/admin/slaptazodis` } }),
    onSuccess: () => { toast.success(`Kvietimas išsiųstas: ${f.email}`); setF({ email: "", company: "", contact_name: "", phone: "" }); refresh(); },
    onError: (e: Error) => toast.error(e.message || "Nepavyko pakviesti"),
  });

  if (!allowed) return <PageBody><Empty title="Neturite prieigos prie šio puslapio" /></PageBody>;

  const list = partners.data ?? [];
  const cl = clients.data ?? [];
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim());
  const canInvite = emailOk && f.company.trim().length > 0 && !inv.isPending;
  function submit(e: FormEvent) { e.preventDefault(); if (canInvite) inv.mutate(); }

  return (
    <>
      <PageHeader title="Partneriai (rangovai)" description="Rangovų registras, jų statusai ir jiems priskirti klientai su SGO planais." />
      <PageBody className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 content-start gap-4">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Aktyvūs" value={list.filter((p) => p.status === "aktyvus").length} />
            <Stat label="Laukia" value={list.filter((p) => p.status === "laukiama").length} />
            <Stat label="Klientų" value={cl.length} />
          </div>
          {partners.isLoading ? (
            <div className="grid gap-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}</div>
          ) : partners.isError ? (
            <Empty title="Nepavyko gauti partnerių"><button className="text-primary underline" onClick={() => partners.refetch()}>Bandyti dar kartą</button></Empty>
          ) : list.length === 0 ? (
            <Empty title="Partnerių dar nėra">Pakvieskite rangovą arba pasidalinkite registracijos nuoroda sgo.lt/partner</Empty>
          ) : (
            list.map((p) => {
              const mine = cl.filter((c) => c.partner_id === p.id);
              const isOpen = open === p.id;
              return (
                <Panel key={p.id}>
                  <div className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-display text-lg font-bold">{p.company || "Be pavadinimo"}</p>
                        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", statusClass[p.status] ?? "bg-muted")}>{statusLabel(p.status)}</span>
                      </div>
                      <p className="mt-1 break-words text-sm text-muted-foreground">
                        {[p.contact_name, p.email, p.phone, p.company_code && `Įm. kodas ${p.company_code}`].filter(Boolean).join(" · ")}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">Registruotas {ltDate(p.created_at, false)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Select value={p.status} onValueChange={(v) => setStatus.mutate({ id: p.id, status: v })}>
                        <SelectTrigger className="h-11 w-[200px]" aria-label="Partnerio statusas"><SelectValue /></SelectTrigger>
                        <SelectContent>{PARTNER_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button variant="outline" className="h-11" onClick={() => setOpen(isOpen ? null : p.id)} aria-expanded={isOpen}>
                        Klientai ({mine.length}) <ChevronDown className={cn("ml-1 h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                      </Button>
                    </div>
                  </div>
                  {isOpen ? (
                    <div className="border-t border-border p-4">
                      {mine.length === 0 ? <p className="text-sm text-muted-foreground">Partneris dar nepridėjo klientų.</p> : (
                        <div className="grid gap-2">
                          {mine.map((c) => (
                            <div key={c.id} className="grid gap-1 rounded-md bg-muted/40 p-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto]">
                              <div className="min-w-0">
                                <p className="font-semibold">{c.name}</p>
                                <p className="break-words text-muted-foreground">{[c.phone, c.email, c.city, c.power && `${c.power} kW`, c.inverter].filter(Boolean).join(" · ")}</p>
                              </div>
                              <span className="self-center rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">{c.plan_name || "Planas nepasirinktas"}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </Panel>
              );
            })
          )}
        </div>
        <Panel className="h-fit p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Handshake className="h-5 w-5 text-primary" /> Pakviesti partnerį</h2>
          <p className="mt-1 text-sm text-muted-foreground">Partneris gaus laišką slaptažodžiui susikurti ir iškart bus aktyvus.</p>
          <form onSubmit={submit} className="mt-4 grid gap-3">
            <div className="grid gap-1.5"><Label htmlFor="pc">Įmonės pavadinimas *</Label><Input id="pc" value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label htmlFor="pe">El. paštas *</Label><Input id="pe" type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label htmlFor="pn">Kontaktinis asmuo</Label><Input id="pn" autoComplete="name" value={f.contact_name} onChange={(e) => setF({ ...f, contact_name: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label htmlFor="pp">Telefonas</Label><Input id="pp" type="tel" autoComplete="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
            <Button type="submit" className="h-11" disabled={!canInvite}>{inv.isPending ? "Siunčiama…" : "Siųsti kvietimą"}</Button>
          </form>
          <p className="mt-4 text-xs text-muted-foreground">Savarankiška registracija: <a href="/partner" target="_blank" rel="noopener noreferrer" className="text-primary underline">sgo.lt/partner</a></p>
        </Panel>
      </PageBody>
    </>
  );
}
