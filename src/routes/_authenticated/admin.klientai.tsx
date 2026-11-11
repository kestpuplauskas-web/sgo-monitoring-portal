import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Empty, PageBody, PageHeader, Panel, StatusPill, ltDate } from "@/components/admin/ui";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin/klientai")({
  component: ClientsPage,
});

type ClientRow = {
  id: string; name: string; email: string; phone: string; city: string; inverter: string; notes: string; created_at: string;
  plan_orders: { id: string; order_no: string; plan_name: string; status: string; created_at: string }[];
};

function ClientsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<ClientRow | null>(null);

  const clients = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*, plan_orders(id,order_no,plan_name,status,created_at)")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data as ClientRow[];
    },
  });

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (clients.data ?? []).filter((c) => !s || [c.name, c.email, c.phone, c.city].some((v) => v.toLowerCase().includes(s)));
  }, [clients.data, q]);

  const save = useMutation({
    mutationFn: async (c: Pick<ClientRow, "id" | "name" | "phone" | "city" | "inverter" | "notes">) => {
      const { error } = await supabase.from("clients").update(c).eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Kliento duomenys išsaugoti"); qc.invalidateQueries({ queryKey: ["clients"] }); setOpen(null); },
    onError: () => toast.error("Nepavyko išsaugoti"),
  });

  function exportCsv() {
    const rows = [["Vardas", "El. paštas", "Telefonas", "Vieta", "Inverteris", "Planai", "Užregistruotas"]];
    for (const c of list) rows.push([c.name, c.email, c.phone, c.city, c.inverter, c.plan_orders.map((o) => o.plan_name).join("; "), ltDate(c.created_at, false)]);
    const csv = "\uFEFF" + rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = "sgo-klientai.csv";
    a.click();
  }

  return (
    <>
      <PageHeader
        title="Klientų registras"
        description="Klientai įtraukiami automatiškai, kai jie užsako planą. Vienas el. paštas – vienas klientas."
        actions={<Button variant="outline" onClick={exportCsv} disabled={!list.length}><Download className="h-4 w-4" /> Atsisiųsti CSV</Button>}
      />
      <PageBody className="grid gap-6">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input aria-label="Paieška" placeholder="Ieškoti kliento…" value={q} onChange={(e) => setQ(e.target.value)} className="h-10 pl-9" />
        </div>
        {clients.isLoading ? (
          <div className="grid gap-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : list.length === 0 ? (
          <Empty title={clients.data?.length ? "Nieko nerasta" : "Klientų dar nėra"}>
            {clients.data?.length ? "Pabandykite kitą paiešką." : "Pirmasis klientas atsiras, kai kas nors užsakys planą svetainėje."}
          </Empty>
        ) : (
          <Panel className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-4 py-3 font-semibold">Klientas</th>
                  <th className="px-4 py-3 font-semibold">Telefonas</th>
                  <th className="px-4 py-3 font-semibold">Vieta</th>
                  <th className="px-4 py-3 font-semibold">Dabartinis planas</th>
                  <th className="px-4 py-3 font-semibold">Užregistruotas</th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => {
                  const last = [...c.plan_orders].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
                  return (
                    <tr key={c.id} onClick={() => setOpen(c)} className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/40">
                      <td className="px-4 py-3"><p className="font-semibold">{c.name}</p><p className="text-xs text-muted-foreground">{c.email}</p></td>
                      <td className="px-4 py-3">{c.phone}</td>
                      <td className="px-4 py-3">{c.city}</td>
                      <td className="px-4 py-3">{last ? <span className="flex items-center gap-2">{last.plan_name} <StatusPill status={last.status} /></span> : "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{ltDate(c.created_at, false)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Panel>
        )}
      </PageBody>
      {open ? <ClientDialog client={open} onClose={() => setOpen(null)} onSave={(c) => save.mutate(c)} saving={save.isPending} /> : null}
    </>
  );
}

function ClientDialog({ client, onClose, onSave, saving }: { client: ClientRow; onClose: () => void; onSave: (c: Pick<ClientRow, "id" | "name" | "phone" | "city" | "inverter" | "notes">) => void; saving: boolean }) {
  const [f, setF] = useState({ name: client.name, phone: client.phone, city: client.city, inverter: client.inverter, notes: client.notes });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{client.name}</DialogTitle>
          <DialogDescription>{client.email}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5"><Label htmlFor="c-name">Vardas ir pavardė</Label><Input id="c-name" value={f.name} onChange={set("name")} /></div>
          <div className="grid gap-1.5"><Label htmlFor="c-phone">Telefonas</Label><Input id="c-phone" type="tel" value={f.phone} onChange={set("phone")} /></div>
          <div className="grid gap-1.5"><Label htmlFor="c-city">Elektrinės vieta</Label><Input id="c-city" value={f.city} onChange={set("city")} /></div>
          <div className="grid gap-1.5"><Label htmlFor="c-inv">Inverteris</Label><Input id="c-inv" value={f.inverter} onChange={set("inverter")} /></div>
          <div className="grid gap-1.5"><Label htmlFor="c-notes">Pastabos</Label><Textarea id="c-notes" rows={3} value={f.notes} onChange={set("notes")} /></div>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">Užsakymų istorija</p>
          <ul className="grid gap-2 text-sm">
            {client.plan_orders.length === 0 ? <li className="text-muted-foreground">Užsakymų nėra</li> : null}
            {client.plan_orders.map((o) => (
              <li key={o.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <span><span className="font-mono text-xs">{o.order_no}</span> · {o.plan_name}</span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">{ltDate(o.created_at, false)} <StatusPill status={o.status} /></span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Atšaukti</Button>
          <Button disabled={saving || f.name.trim().length < 2} onClick={() => onSave({ id: client.id, ...f })}>{saving ? "Saugoma…" : "Išsaugoti"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
