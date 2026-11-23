import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/admin/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { passwordErrorMessage } from "@/lib/password-errors";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Slaptažodžio atkūrimas | SGO partneriai" },
    { name: "description", content: "Saugiai nustatykite naują SGO partnerio paskyros slaptažodį." },
    { property: "og:title", content: "Slaptažodžio atkūrimas | SGO partneriai" },
    { property: "og:description", content: "SGO partnerio paskyros slaptažodžio atkūrimas." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"checking" | "ready" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const recovery = new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery";
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (active && event === "PASSWORD_RECOVERY" && session) setStatus("ready");
      if (active && event === "SIGNED_OUT") setStatus("invalid");
    });
    supabase.auth.getUser().then(({ data, error: authError }) => {
      if (!active) return;
      setStatus((current) => current === "ready" ? current : recovery && data.user && !authError ? "ready" : "invalid");
    }).catch(() => { if (active) setStatus("invalid"); });
    return () => { active = false; subscription.subscription.unsubscribe(); };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (status !== "ready" || busy) return;
    setError("");
    if (password.length < 8) return setError("Slaptažodis turi būti bent 8 simbolių.");
    if (password !== confirmation) return setError("Slaptažodžiai nesutampa. Pakartokite naują slaptažodį.");
    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) { setError(passwordErrorMessage(updateError)); return; }
      toast.success("Slaptažodis pakeistas");
      await navigate({ to: "/partner/portalas", replace: true });
    } catch { setError("Nepavyko pakeisti slaptažodžio. Patikrinkite interneto ryšį ir bandykite dar kartą."); }
    finally { setBusy(false); }
  }

  return <AuthShell title="Atkurkite slaptažodį" subtitle="Nustatykite naują SGO partnerio paskyros slaptažodį.">
    {status === "checking" ? <p role="status" className="text-sm text-muted-foreground">Tikrinama atkūrimo nuoroda…</p> : status === "invalid" ? <div className="grid gap-4">
      <p role="alert" className="text-sm text-destructive">Nuoroda negalioja arba jau panaudota. Paprašykite administratoriaus išsiųsti naują slaptažodžio atkūrimo nuorodą.</p>
      <Button variant="outline" asChild className="h-11"><Link to="/partner">Grįžti į partnerių prisijungimą</Link></Button>
    </div> : <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-2"><Label htmlFor="new-password">Naujas slaptažodis</Label><Input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} aria-describedby="password-hint" required /><p id="password-hint" className="text-xs text-muted-foreground">Bent 8 simboliai. Rinkitės ilgą, unikalų slaptažodį.</p></div>
      <div className="grid gap-2"><Label htmlFor="confirm-password">Pakartokite slaptažodį</Label><Input id="confirm-password" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></div>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="h-11" disabled={busy || !password || !confirmation}>{busy ? "Saugoma…" : "Išsaugoti ir prisijungti"}</Button>
    </form>}
  </AuthShell>;
}