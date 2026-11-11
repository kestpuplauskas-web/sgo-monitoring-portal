import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Mail, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Empty, PageBody, PageHeader, Panel, StatusPill, ltDate } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin/uzklausos")({
  component: InquiriesPage,
});

const STATUSES = [
  { value: "nauja", label: "Nauja" },
  { value: "perziureta", label: "Peržiūrėta" },
  { value: "susisiekta", label: "Atsakyta" },
  { value: "uzdaryta", label: "Uždaryta" },
];

type Row = {
  id: string; name: string; email: string; phone: string; city: string; service: string; power: string;
  message: string; page: string; status: string; notes: string; created_at: string;
};

function InquiriesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState<Row | null>(null);
  const [notes, setNotes] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const list = useQuery({
    queryKey: ["inquiries"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inquiries").select("*").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data as Row[];
    },
  });

  const save = useMutation({
    mutationFn: async (v: { id: string; status?: string; notes?: string }) => {
      const { id, ...rest } = v;
      const { error } = await supabase.from("inquiries").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Išsaugota");
      qc.invalidateQueries({ queryKey: ["inquiries"] });
      qc.invalidateQueries({ queryKey: ["inquiries-new-count"] });
    },
    onError: () => toast.error("Nepavyko išsaugoti"),
  });

  const markSeen = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inquiries").update({ status: "perziureta" }).eq("id", id).eq("status", "nauja");
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inquiries"] });
      qc.invalidateQueries({ queryKey: ["inquiries-new-count"] });
    },
  });

  const rows = (list.data ?? []).filter((r) => filter === "all" || r.status === filter);

  return (
    <>
      <PageHeader title="Klientų užklausos" description="Žinutės iš svetainės kontaktų formos. Naujausios viršuje." />
      <PageBody className="grid gap-4">
        <div className="flex flex-wrap gap-2">
          {[{ value: "all", label: "Visos" }, ...STATUSES].map((s) => (
            <Button key={s.value} size="sm" variant={filter === s.value ? "default" : "outline"} onClick={() => setFilter(s.value)}>{s.label}</Button>
          ))}
        </div>
        {list.isLoading ? (
          <div className="grid gap-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : rows.length === 0 ? (
          <Empty title="Užklausų nėra">Kai lankytojas parašys per svetainės kontaktų formą, žinutė atsiras čia.</Empty>
        ) : (
          <Panel className="divide-y divide-border p-0">
            {rows.map((r) => (
              <button key={r.id} type="button" onClick={() => {
                const seen = r.status === "nauja" ? { ...r, status: "perziureta" } : r;
                setOpen(seen); setNotes(r.notes);
                if (r.status === "nauja") markSeen.mutate(r.id);
              }} className="flex w-full items-start justify-between gap-4 p-4 text-left hover:bg-muted/40">
                <div className="min-w-0">
                  <p className="font-semibold">{r.name} {r.service ? <span className="font-normal text-muted-foreground">· {r.service}</span> : null}</p>
                  <p className="truncate text-sm text-muted-foreground">{r.message}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StatusPill status={r.status} />
                  <span className="text-xs text-muted-foreground">{ltDate(r.created_at)}</span>
                </div>
              </button>
            ))}
          </Panel>
        )}
      </PageBody>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-lg">
          {open ? (
            <>
              <DialogHeader>
                <DialogTitle>{open.name}</DialogTitle>
                <DialogDescription>{ltDate(open.created_at)}{open.page ? ` · ${open.page}` : ""}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 text-sm">
                <div className="flex flex-wrap gap-3">
                  <a className="inline-flex items-center gap-1 text-primary underline" href={`mailto:${open.email}`}><Mail className="h-4 w-4" />{open.email}</a>
                  {open.phone ? <a className="inline-flex items-center gap-1 text-primary underline" href={`tel:${open.phone}`}><Phone className="h-4 w-4" />{open.phone}</a> : null}
                </div>
                {[["Vieta", open.city], ["Paslauga", open.service], ["Galia", open.power]].filter(([, v]) => v).map(([k, v]) => (
                  <p key={k}><span className="text-muted-foreground">{k}: </span>{v}</p>
                ))}
                <p className="whitespace-pre-wrap rounded-md bg-muted/40 p-3">{open.message}</p>
                <div className="grid gap-1.5">
                  <Label>Būsena</Label>
                  <div className="flex flex-wrap gap-2">
                    {STATUSES.map((s) => (
                      <Button key={s.value} size="sm" variant={open.status === s.value ? "default" : "outline"}
                        onClick={() => { save.mutate({ id: open.id, status: s.value }); setOpen({ ...open, status: s.value }); }}>{s.label}</Button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="inq-notes">Pastabos</Label>
                  <Textarea id="inq-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpen(null)}>Uždaryti</Button>
                  <Button disabled={save.isPending} onClick={() => save.mutate({ id: open.id, notes })}>Išsaugoti pastabas</Button>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
