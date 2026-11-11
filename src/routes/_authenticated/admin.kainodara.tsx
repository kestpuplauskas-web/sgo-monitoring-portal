import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageBody, PageHeader, Panel } from "@/components/admin/ui";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { formatEur } from "@/lib/plan-format";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/admin/kainodara")({
  component: PricingPage,
});

type Plan = Tables<"plans">;

function PricingPage() {
  const plans = useQuery({
    queryKey: ["plans-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("plans").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });
  return (
    <>
      <PageHeader
        title="Planų kainodara"
        description="Pakeitimai iškart matomi svetainės planų skiltyje. Kainos nurodomos su PVM."
        actions={<Button variant="outline" asChild><a href="/#planai" target="_blank" rel="noopener noreferrer">Peržiūrėti svetainėje</a></Button>}
      />
      <PageBody className="grid gap-5 xl:grid-cols-2">
        {plans.isLoading ? [0, 1].map((i) => <Skeleton key={i} className="h-96" />) : plans.data?.map((p) => <PlanEditor key={p.id} plan={p} />)}
      </PageBody>
    </>
  );
}

function PlanEditor({ plan }: { plan: Plan }) {
  const qc = useQueryClient();
  const init = () => ({
    name: plan.name,
    price: String(plan.price),
    old_price: plan.old_price == null ? "" : String(plan.old_price),
    period_label: plan.period_label,
    tagline: plan.tagline,
    features: plan.features.join("\n"),
    benefit: plan.benefit,
    promo: plan.promo,
    activation_fee: String(plan.activation_fee),
    recommended: plan.recommended,
    active: plan.active,
    sort_order: String(plan.sort_order),
  });
  const [f, setF] = useState(init);
  useEffect(() => setF(init()), [plan.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = JSON.stringify(f) !== JSON.stringify(init());
  const num = (v: string) => Number(v.replace(",", "."));
  const priceOk = (v: string) => v.trim() !== "" && !Number.isNaN(num(v)) && num(v) >= 0;
  const valid = f.name.trim().length > 1 && priceOk(f.price) && priceOk(f.activation_fee) && (f.old_price === "" || priceOk(f.old_price));

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("plans")
        .update({
          name: f.name.trim(),
          price: num(f.price),
          old_price: f.old_price === "" ? null : num(f.old_price),
          period_label: f.period_label.trim(),
          tagline: f.tagline.trim(),
          features: f.features.split("\n").map((s) => s.trim()).filter(Boolean),
          benefit: f.benefit.trim(),
          promo: f.promo.trim(),
          activation_fee: num(f.activation_fee),
          recommended: f.recommended,
          active: f.active,
          sort_order: parseInt(f.sort_order) || 0,
        })
        .eq("id", plan.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success(`„${f.name}“ išsaugotas – svetainėje jau matoma nauja informacija`); qc.invalidateQueries({ queryKey: ["plans-admin"] }); },
    onError: () => toast.error("Nepavyko išsaugoti plano"),
  });

  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const id = (k: string) => `${plan.slug}-${k}`;

  return (
    <Panel className={f.recommended ? "border-primary p-6" : "p-6"}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-xl font-extrabold">{f.name || "Be pavadinimo"}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatEur(num(f.price) || 0)} {f.period_label}
            {f.old_price ? <span className="ml-2 line-through">{formatEur(num(f.old_price))}</span> : null}
            {" · "}aktyvavimas {formatEur(num(f.activation_fee) || 0)}
          </p>
        </div>
        {f.recommended ? <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary"><Star className="h-3 w-3" /> Rekomenduojamas</span> : null}
      </div>

      <div className="mt-5 grid gap-4">
        <div className="grid gap-1.5"><Label htmlFor={id("name")}>Pavadinimas</Label><Input id={id("name")} value={f.name} onChange={set("name")} /></div>
        <div className="grid grid-cols-3 gap-3">
          <div className="grid gap-1.5"><Label htmlFor={id("price")}>Kaina, €</Label><Input id={id("price")} inputMode="decimal" value={f.price} onChange={set("price")} aria-invalid={!priceOk(f.price)} /></div>
          <div className="grid gap-1.5"><Label htmlFor={id("old")}>Sena kaina, €</Label><Input id={id("old")} inputMode="decimal" placeholder="Nėra" value={f.old_price} onChange={set("old_price")} /></div>
          <div className="grid gap-1.5"><Label htmlFor={id("per")}>Laikotarpis</Label><Input id={id("per")} value={f.period_label} onChange={set("period_label")} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5"><Label htmlFor={id("act")}>Aktyvavimas, €</Label><Input id={id("act")} inputMode="decimal" value={f.activation_fee} onChange={set("activation_fee")} /></div>
          <div className="grid gap-1.5"><Label htmlFor={id("sort")}>Eilės nr. svetainėje</Label><Input id={id("sort")} inputMode="numeric" value={f.sort_order} onChange={set("sort_order")} /></div>
        </div>
        <div className="grid gap-1.5"><Label htmlFor={id("promo")}>Akcijos tekstas</Label><Input id={id("promo")} placeholder="Pvz. −40 % užsakant iki 12-31" value={f.promo} onChange={set("promo")} /></div>
        <div className="grid gap-1.5"><Label htmlFor={id("tag")}>Trumpas aprašymas</Label><Input id={id("tag")} value={f.tagline} onChange={set("tagline")} /></div>
        <div className="grid gap-1.5">
          <Label htmlFor={id("feat")}>Kas įeina</Label>
          <Textarea id={id("feat")} rows={6} value={f.features} onChange={set("features")} />
          <p className="text-xs text-muted-foreground">Viena paslauga – viena eilutė. Pirma eilutė, prasidedanti „Visos…“, rodoma paryškinta.</p>
        </div>
        <div className="grid gap-1.5"><Label htmlFor={id("ben")}>Nauda jums</Label><Textarea id={id("ben")} rows={2} value={f.benefit} onChange={set("benefit")} /></div>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm"><Switch checked={f.recommended} onCheckedChange={(v) => setF({ ...f, recommended: v })} /> Rekomenduojamas</label>
          <label className="flex items-center gap-2 text-sm"><Switch checked={f.active} onCheckedChange={(v) => setF({ ...f, active: v })} /> Rodomas svetainėje</label>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" disabled={!dirty} onClick={() => setF(init())}>Atšaukti pakeitimus</Button>
          <Button disabled={!dirty || !valid || save.isPending} onClick={() => save.mutate()}>{save.isPending ? "Saugoma…" : "Išsaugoti"}</Button>
        </div>
      </div>
    </Panel>
  );
}
