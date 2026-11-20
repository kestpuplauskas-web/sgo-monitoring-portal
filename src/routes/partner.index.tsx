import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { classifyPasswordError, passwordErrorMessage } from "@/lib/password-errors";

export const Route = createFileRoute("/partner/")({
  head: () => ({ meta: [
    { title: "SGO partnerių programa rangovams | sgo.lt/partner" },
    { name: "description", content: "Saulės elektrinių rangovams: registruokitės SGO partneriu, pridėkite savo klientus ir parinkite jiems SGO priežiūros planus." },
    { property: "og:title", content: "SGO partnerių programa rangovams" },
    { property: "og:description", content: "Registruokitės SGO partneriu ir valdykite savo klientų elektrinių priežiūrą vienoje vietoje." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: PartnerPage,
});

function PartnerPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"register" | "login">("register");
  const [f, setF] = useState({ company: "", company_code: "", full_name: "", phone: "", city: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) navigate({ to: "/partner/portalas", replace: true }); });
  }, [navigate]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim());
  const valid = mode === "login" ? emailOk && f.password.length > 0 : emailOk && f.password.length >= 8 && f.company.trim() && f.full_name.trim() && f.phone.trim();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setError(""); setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: f.email.trim(), password: f.password });
        if (error) throw new Error("Neteisingas el. paštas arba slaptažodis.");
        navigate({ to: "/partner/portalas", replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: f.email.trim(),
          password: f.password,
          options: {
            emailRedirectTo: `${window.location.origin}/partner/portalas`,
            data: { signup_as: "partner", company: f.company.trim(), company_code: f.company_code.trim(), full_name: f.full_name.trim(), phone: f.phone.trim(), city: f.city.trim() },
          },
        });
        if (error) throw new Error(classifyPasswordError(error) === "weak" || classifyPasswordError(error) === "rate-limit" ? passwordErrorMessage(error) : "Nepavyko užregistruoti. Gal šis el. paštas jau naudojamas?");
        if (data.session) navigate({ to: "/partner/portalas", replace: true });
        else setDone(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Įvyko klaida");
    } finally { setBusy(false); }
  }

  return (
    <main className="admin-panel min-h-dvh bg-background">
      <header className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-8">
        <a href="/" className="flex items-center gap-2" aria-label="SGO pradžia"><img src="/assets/sgo-logo-mark.webp" alt="" className="h-8 w-8" /><img src="/assets/sgo-logo-sgo.webp" alt="SGO" className="h-6 w-auto" /></a>
        <a href="tel:+37060606222" className="text-sm text-muted-foreground hover:text-foreground">+370 606 06222</a>
      </header>
      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-10 sm:px-8 lg:grid-cols-2 lg:py-16">
        <section>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">Rangovams</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold lg:text-4xl">SGO partnerių programa</h1>
          <p className="mt-4 text-muted-foreground">Įrengiate saulės elektrines? Pridėkite savo klientus į SGO sistemą ir parinkite jiems priežiūros planą — mes stebėsime elektrines, o jūs išlaikysite ryšį su klientu.</p>
          <ul className="mt-6 grid gap-3 text-sm">
            {["Visi jūsų klientai vienoje vietoje", "Kiekvienam klientui — tinkamas SGO planas", "Klientai mato, kuris rangovas prižiūri jų elektrinę"].map((t) => (
              <li key={t} className="flex gap-2"><CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />{t}</li>
            ))}
          </ul>
        </section>
        <section className="rounded-lg border border-border bg-card p-5 sm:p-6">
          {done ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
              <h2 className="mt-3 font-display text-xl font-bold">Registracija gauta!</h2>
              <p className="mt-2 text-sm text-muted-foreground">Patvirtinkite el. paštą paspaudę nuorodą laiške <b>{f.email}</b>. SGO administratorius patvirtins jūsų partnerystę ir galėsite pridėti klientus.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1" role="tablist">
                {(["register", "login"] as const).map((m) => (
                  <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setError(""); }}
                    className={`min-h-11 rounded-full text-sm font-semibold ${mode === m ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
                    {m === "register" ? "Registruotis" : "Prisijungti"}
                  </button>
                ))}
              </div>
              <form onSubmit={submit} className="mt-5 grid gap-3" noValidate>
                {mode === "register" ? (
                  <>
                    <div className="grid gap-1.5"><Label htmlFor="c">Įmonės pavadinimas *</Label><Input id="c" autoComplete="organization" value={f.company} onChange={set("company")} /></div>
                    <div className="grid gap-1.5"><Label htmlFor="cc">Įmonės kodas</Label><Input id="cc" inputMode="numeric" value={f.company_code} onChange={set("company_code")} /></div>
                    <div className="grid gap-1.5"><Label htmlFor="n">Kontaktinis asmuo *</Label><Input id="n" autoComplete="name" value={f.full_name} onChange={set("full_name")} /></div>
                    <div className="grid gap-1.5"><Label htmlFor="t">Telefonas *</Label><Input id="t" type="tel" autoComplete="tel" value={f.phone} onChange={set("phone")} /></div>
                    <div className="grid gap-1.5"><Label htmlFor="ci">Miestas</Label><Input id="ci" autoComplete="address-level2" value={f.city} onChange={set("city")} /></div>
                  </>
                ) : null}
                <div className="grid gap-1.5"><Label htmlFor="e">El. paštas *</Label><Input id="e" type="email" autoComplete="email" value={f.email} onChange={set("email")} /></div>
                <div className="grid gap-1.5">
                  <Label htmlFor="p">Slaptažodis *</Label>
                  <Input id="p" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={f.password} onChange={set("password")} />
                  {mode === "register" ? <p className="text-xs text-muted-foreground">Bent 8 simboliai, geriausia — unikalus.</p> : null}
                </div>
                {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
                <Button type="submit" className="h-11" disabled={!valid || busy}>{busy ? "Palaukite…" : mode === "register" ? "Tapti partneriu" : "Prisijungti"}</Button>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
