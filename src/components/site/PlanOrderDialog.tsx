import { useEffect, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

type Plan = { id: string; name: string; price: number; old_price: number | null; period_label: string; tagline: string; recommended: boolean; activation_fee: number };
type Done = { order_no: string; plan_name: string; email: string };

const eur = (n: number) => `${Number(n).toLocaleString("lt-LT")} €`;

export function PlanOrderButton({ className, children }: { className?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>{children}</button>
      <PlanOrderDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

function PlanOrderDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [planId, setPlanId] = useState("");
  const [f, setF] = useState({ name: "", email: "", phone: "", city: "", installer: "", inverter: "" });
  const [agree, setAgree] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<Done | null>(null);

  useEffect(() => {
    if (!open || plans) return;
    fetch("/api/public/plans").then((r) => r.json()).then((d: { plans: Plan[] }) => {
      setPlans(d.plans);
      setPlanId((d.plans.find((p) => p.recommended) ?? d.plans[0])?.id ?? "");
    }).catch(() => setErr("Nepavyko įkelti planų. Skambinkite +370 606 06222."));
  }, [open, plans]);

  const errors = {
    name: f.name.trim().length < 2 ? "Įveskite vardą ir pavardę." : "",
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim()) ? "" : "Įveskite teisingą el. pašto adresą, pvz. vardas@pastas.lt.",
    phone: /^[+\d][\d\s()-]{6,29}$/.test(f.phone.trim()) ? "" : "Įveskite telefono numerį, pvz. +370 600 00000.",
    city: f.city.trim().length < 2 ? "Įveskite elektrinės vietą (miestą ar adresą)." : "",
  };
  const valid = !Object.values(errors).some(Boolean) && agree && !!planId;
  const plan = plans?.find((p) => p.id === planId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ name: true, email: true, phone: true, city: true });
    if (!valid) return;
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/public/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan_id: planId, ...f, hp: "" }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error ?? "");
      setDone({ order_no: d.order_no, plan_name: d.plan_name, email: f.email.trim() });
    } catch (x) {
      setErr(`${x instanceof Error && x.message ? x.message + " " : ""}Jei nepavyksta, skambinkite +370 606 06222.`);
    } finally { setBusy(false); }
  }

  const field = (k: keyof typeof f, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => {
    const e = k in errors ? errors[k as keyof typeof errors] : "";
    const show = touched[k] && e;
    return (
      <div className="grid gap-1.5">
        <Label htmlFor={`po-${k}`}>{label}</Label>
        <Input id={`po-${k}`} value={f[k]} aria-invalid={!!show} className={show ? "border-destructive" : ""}
          onChange={(ev) => setF({ ...f, [k]: ev.target.value })} onBlur={() => setTouched({ ...touched, [k]: true })} {...props} />
        {show ? <p className="text-sm text-destructive">{e}</p> : null}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o && done) { setDone(null); setF({ name: "", email: "", phone: "", city: "", installer: "", inverter: "" }); setAgree(false); setTouched({}); } }}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        {done ? (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-3xl font-extrabold text-primary-foreground" aria-hidden="true">✓</div>
            <DialogTitle className="font-display text-2xl">Planas užsakytas!</DialogTitle>
            <DialogDescription className="mt-2">Jūsų planas „{done.plan_name}“ užregistruotas.</DialogDescription>
            <p className="mt-3 inline-block rounded-md bg-muted px-3 py-1.5 font-mono">{done.order_no}</p>
            <ol className="mt-5 grid list-decimal gap-2 pl-5 text-left text-sm text-muted-foreground">
              <li>Užsakymą gavome – jį matome savo sistemoje.</li>
              <li>Per 1 darbo dieną susisieksime telefonu arba el. paštu ({done.email}).</li>
              <li>Suderinsime pajungimą ir aktyvuosime planą.</li>
            </ol>
            <Button className="mt-6" onClick={() => onOpenChange(false)}>Uždaryti</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="grid gap-4" noValidate>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">Plano užsakymas</DialogTitle>
              <DialogDescription>Pasirinkite planą ir palikite kontaktus – susisieksime per 1 darbo dieną.</DialogDescription>
            </DialogHeader>
            <fieldset className="grid gap-2">
              <legend className="mb-1 text-sm font-medium">Planas</legend>
              {!plans ? <p className="text-sm text-muted-foreground">Kraunama…</p> : plans.map((p) => (
                <label key={p.id} className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3 ${planId === p.id ? "border-primary bg-primary/10" : "border-border"}`}>
                  <span className="flex items-center gap-3">
                    <input type="radio" name="plan" checked={planId === p.id} onChange={() => setPlanId(p.id)} className="h-4 w-4 accent-[var(--primary)]" />
                    <span><b>{p.name}</b>{p.recommended ? <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">REKOMENDUOJAME</span> : null}<br /><span className="text-xs text-muted-foreground">{p.tagline}</span></span>
                  </span>
                  <span className="whitespace-nowrap text-right font-bold">{eur(p.price)}{p.old_price ? <s className="ml-1 text-xs font-normal text-muted-foreground">{eur(p.old_price)}</s> : null}<br /><span className="text-xs font-normal text-muted-foreground">{p.period_label}</span></span>
                </label>
              ))}
              {plan ? <p className="text-xs text-muted-foreground">Vienkartinis aktyvavimas – {eur(plan.activation_fee)}. Visos kainos su PVM.</p> : null}
            </fieldset>
            {field("name", "Vardas ir pavardė", { autoComplete: "name", maxLength: 100 })}
            {field("email", "El. paštas", { type: "email", autoComplete: "email", maxLength: 255 })}
            {field("phone", "Telefonas", { type: "tel", autoComplete: "tel", inputMode: "tel", maxLength: 30 })}
            {field("city", "Elektrinės vieta (miestas ar adresas)", { autoComplete: "address-level2", maxLength: 150 })}
            {field("installer", "Rangovas, įrengęs elektrinę (neprivaloma)", { maxLength: 100, placeholder: "Pvz. įmonės pavadinimas" })}
            {field("inverter", "Inverterio gamintojas (neprivaloma)", { maxLength: 60 })}
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={agree} onCheckedChange={(v) => setAgree(v === true)} className="mt-0.5" />
              <span>Sutinku, kad SGO susisiektų dėl užsakymo ir tvarkytų mano duomenis pagal <a href="/#privatumo-politika" className="underline">privatumo politiką</a>.</span>
            </label>
            {err ? <p className="text-sm text-destructive" role="alert">{err}</p> : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Atšaukti</Button>
              <Button type="submit" disabled={busy || !agree || !planId}>{busy ? "Siunčiama…" : "Patvirtinti užsakymą"}</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
