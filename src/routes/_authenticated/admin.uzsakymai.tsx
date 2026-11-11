import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Empty, PageBody, PageHeader, Panel, Stat, StatusPill, ltDate } from "@/components/admin/ui";
import { ORDER_STATUSES } from "@/lib/admin-roles";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/admin/uzsakymai")({
  head: () => ({ meta: [
    { title: "Planų užsakymai | SGO administravimas" },
    { name: "description", content: "Planų užsakymai SGO valdymo sistemoje." },
    { property: "og:title", content: "Planų užsakymai | SGO" },
    { property: "og:description", content: "Planų užsakymai SGO valdymo sistemoje." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: OrdersPage,
});

type Order = Tables<"plan_orders">;

function OrdersPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("visi");
  const [open, setOpen] = useState<Order | null>(null);

  const orders = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("plan_orders").select("*").order("created_at", { ascending: false }).limit(1000);
      if (error) throw error;
      return data;
    },
  });

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (orders.data ?? []).filter(
      (o) =>
        (status === "visi" || o.status === status) &&
        (!s || [o.order_no, o.name, o.email, o.phone, o.city, o.plan_name].some((v) => v.toLowerCase().includes(s))),
    );
  }, [orders.data, q, status]);

  const all = orders.data ?? [];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const fresh = all.filter((o) => o.status === "nauja").length;
  const month = all.filter((o) => new Date(o.created_at).getTime() >= monthStart).length;
  const active = all.filter((o) => o.status === "aktyvuota").length;

  const save = useMutation({
    mutationFn: async (o: Pick<Order, "id" | "status" | "admin_notes">) => {
      const { error } = await supabase.from("plan_orders").update({ status: o.status, admin_notes: o.admin_notes }).eq("id", o.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Užsakymas atnaujintas");
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["orders-new-count"] });
      setOpen(null);
    },
    onError: () => toast.error("Nepavyko išsaugoti. Bandykite dar kartą."),
  });

  return (
    <>
      <PageHeader title="Planų užsakymai" description="Čia patenka planai, kuriuos klientai pasirinko ir užsakė svetainėje." />
      <PageBody className="grid gap-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 [&>*:first-child]:col-span-2 sm:[&>*:first-child]:col-span-1">
          <Stat label="Nauji, laukia veiksmo" value={orders.isLoading ? "…" : fresh} />
          <Stat label="Šį mėnesį" value={orders.isLoading ? "…" : month} />
          <Stat label="Aktyvuoti planai" value={orders.isLoading ? "…" : active} />
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input aria-label="Paieška" placeholder="Ieškoti pagal vardą, el. paštą, numerį…" value={q} onChange={(e) => setQ(e.target.value)} className="h-10 pl-9" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-11 w-full sm:w-48" aria-label="Būsena"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="visi">Visos būsenos</SelectItem>
              {ORDER_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {orders.isLoading ? (
          <div className="grid gap-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : list.length === 0 ? (
          <Empty title={all.length ? "Nieko nerasta" : "Užsakymų dar nėra"}>
            {all.length ? "Pakeiskite paiešką arba būsenos filtrą." : "Kai klientas svetainėje pasirinks planą, užsakymas atsiras čia."}
          </Empty>
        ) : (
          <>
          <ul className="grid gap-3 md:hidden">
            {list.map((o) => <li key={o.id}><Button variant="outline" onClick={() => setOpen(o)} className="grid h-auto w-full grid-cols-[minmax(0,1fr)_auto] gap-3 whitespace-normal rounded-lg bg-card p-4 text-left">
              <div className="min-w-0"><p className="font-mono text-xs text-muted-foreground">{o.order_no}</p><p className="mt-1 break-words text-base font-semibold">{o.name}</p><p className="mt-2 text-sm text-primary">{o.plan_name} · {o.price_label}</p><p className="mt-1 break-words text-xs text-muted-foreground">{o.city} · {ltDate(o.created_at, false)}</p></div>
              <div className="flex shrink-0 flex-col items-end justify-between gap-4"><StatusPill status={o.status} /><ChevronRight className="h-5 w-5 text-muted-foreground" /></div>
            </Button></li>)}
          </ul>
          <Panel className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-4 py-3 font-semibold">Nr.</th>
                  <th className="px-4 py-3 font-semibold">Klientas</th>
                  <th className="px-4 py-3 font-semibold">Planas</th>
                  <th className="px-4 py-3 font-semibold">Vieta</th>
                  <th className="px-4 py-3 font-semibold">Gauta</th>
                  <th className="px-4 py-3 font-semibold">Būsena</th>
                </tr>
              </thead>
              <tbody>
                {list.map((o) => (
                  <tr key={o.id} onClick={() => setOpen(o)} className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-3 font-mono text-xs">
                      <button className="text-left hover:text-primary" onClick={(e) => { e.stopPropagation(); setOpen(o); }}>{o.order_no}</button>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{o.name}</p>
                      <p className="text-xs text-muted-foreground">{o.email} · {o.phone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{o.plan_name}</p>
                      <p className="text-xs text-muted-foreground">{o.price_label}</p>
                    </td>
                    <td className="px-4 py-3">{o.city}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{ltDate(o.created_at)}</td>
                    <td className="px-4 py-3"><StatusPill status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
          </>
        )}
      </PageBody>
      {open ? <OrderDialog order={open} onClose={() => setOpen(null)} onSave={(o) => save.mutate(o)} saving={save.isPending} /> : null}
    </>
  );
}

function OrderDialog({ order, onClose, onSave, saving }: { order: Order; onClose: () => void; onSave: (o: Pick<Order, "id" | "status" | "admin_notes">) => void; saving: boolean }) {
  const [status, setStatus] = useState(order.status);
  const [notes, setNotes] = useState(order.admin_notes);
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="admin-dialog max-w-lg">
        <DialogHeader>
          <DialogTitle>Užsakymas {order.order_no}</DialogTitle>
          <DialogDescription>Gautas {ltDate(order.created_at)}</DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-[80px_minmax(0,1fr)] gap-x-3 gap-y-3 break-words sm:grid-cols-[120px_minmax(0,1fr)] [&_dd]:min-w-0 [&_a]:break-all text-sm">
          <dt className="text-muted-foreground">Planas</dt><dd className="font-semibold">{order.plan_name} · {order.price_label}</dd>
          <dt className="text-muted-foreground">Vardas</dt><dd>{order.name}</dd>
          <dt className="text-muted-foreground">El. paštas</dt><dd><a className="text-primary hover:underline" href={`mailto:${order.email}`}>{order.email}</a></dd>
          <dt className="text-muted-foreground">Telefonas</dt><dd><a className="text-primary hover:underline" href={`tel:${order.phone.replace(/\s/g, "")}`}>{order.phone}</a></dd>
          <dt className="text-muted-foreground">Vieta</dt><dd>{order.city}</dd>
          <dt className="text-muted-foreground">Inverteris</dt><dd>{order.inverter || "—"}</dd>
        </dl>
        <div className="grid gap-2">
          <Label>Būsena</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ORDER_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="notes">Vidinės pastabos</Label>
          <Textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Pvz. paskambinta, prijungimas suderintas 11-15" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <Button variant="outline" onClick={onClose}>Atšaukti</Button>
          <Button onClick={() => onSave({ id: order.id, status, admin_notes: notes })} disabled={saving}>{saving ? "Saugoma…" : "Išsaugoti"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
