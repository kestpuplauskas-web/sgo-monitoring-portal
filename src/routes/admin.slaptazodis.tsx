import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/admin/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { passwordErrorMessage } from "@/lib/password-errors";

export const Route = createFileRoute("/admin/slaptazodis")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Slaptažodžio nustatymas | SGO administravimas" },
      { name: "description", content: "Nustatykite SGO administravimo paskyros slaptažodį." },
      { property: "og:title", content: "Slaptažodžio nustatymas | SGO" },
      { property: "og:description", content: "Nustatykite SGO administravimo paskyros slaptažodį." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SetPasswordPage,
});

function SetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setReady(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (pw.length < 8) return setError("Slaptažodis turi būti bent 8 simbolių.");
    if (pw !== pw2) return setError("Slaptažodžiai nesutampa.");
    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: pw });
      if (updateError) return setError(passwordErrorMessage(updateError));
      toast.success("Slaptažodis išsaugotas");
      await navigate({ to: "/admin", replace: true });
    } catch {
      setError(passwordErrorMessage({}));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Nustatykite slaptažodį" subtitle="Sukurkite slaptažodį, kuriuo jungsitės prie SGO valdymo sistemos.">
      {!ready ? (
        <p className="text-sm text-muted-foreground">Tikrinama nuoroda… Jei niekas nevyksta, atidarykite nuorodą iš laiško dar kartą.</p>
      ) : (
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="pw">Naujas slaptažodis</Label>
            <Input id="pw" type="password" autoComplete="new-password" aria-describedby="pw-hint" value={pw} onChange={(e) => setPw(e.target.value)} />
            <p id="pw-hint" className="text-xs text-muted-foreground">Bent 8 simboliai. Rinkitės ilgą, unikalų slaptažodį, nenaudojamą kitose paskyrose.</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pw2">Pakartokite slaptažodį</Label>
            <Input id="pw2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
          </div>
          {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
          <Button type="submit" disabled={busy || !pw || !pw2} className="h-11 rounded-full font-semibold">
            {busy ? "Saugoma…" : "Išsaugoti ir prisijungti"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
