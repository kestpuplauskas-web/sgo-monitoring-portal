import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/admin/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin/prisijungimas")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Prisijungimas | SGO administravimas" },
      { name: "description", content: "SGO administravimo sistemos prisijungimas." },
      { property: "og:title", content: "Prisijungimas | SGO administravimas" },
      { property: "og:description", content: "SGO administravimo sistemos prisijungimas." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "setup" | "forgot">("login");
  const [canSetup, setCanSetup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/admin", replace: true });
    });
    supabase.rpc("admin_exists").then(({ data }) => setCanSetup(data === false));
  }, [navigate]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw new Error("Neteisingas el. paštas arba slaptažodis.");
        toast.success("Prisijungta");
        navigate({ to: "/admin", replace: true });
      } else if (mode === "setup") {
        if (password.length < 8) throw new Error("Slaptažodis turi būti bent 8 simbolių.");
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        });
        if (error) throw new Error(error.message);
        if (data.session) navigate({ to: "/admin", replace: true });
        else setInfo("Patvirtinimo nuoroda išsiųsta el. paštu. Paspaudę ją, prisijunkite čia.");
      } else {
        await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/admin/slaptazodis`,
        });
        setInfo("Jei toks vartotojas yra, išsiuntėme slaptažodžio keitimo nuorodą.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Įvyko klaida");
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "login" ? "Administravimas" : mode === "setup" ? "Pirmasis administratorius" : "Pamiršote slaptažodį?";
  const subtitle =
    mode === "login"
      ? "Prisijunkite prie SGO valdymo sistemos."
      : mode === "setup"
        ? "Sistemoje dar nėra administratoriaus. Sukurkite pagrindinę paskyrą."
        : "Įveskite el. paštą – atsiųsime nuorodą naujam slaptažodžiui.";

  return (
    <AuthShell title={title} subtitle={subtitle}>
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <div className="grid gap-2">
          <Label htmlFor="email">El. paštas</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {mode !== "forgot" ? (
          <div className="grid gap-2">
            <Label htmlFor="password">Slaptažodis</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "setup" ? "new-password" : "current-password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        ) : null}
        {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
        {info ? <p className="text-sm text-primary" role="status">{info}</p> : null}
        <Button type="submit" disabled={busy || !email || (mode !== "forgot" && !password)} className="h-11 rounded-full font-semibold">
          {busy ? "Palaukite…" : mode === "login" ? "Prisijungti" : mode === "setup" ? "Sukurti paskyrą" : "Siųsti nuorodą"}
        </Button>
      </form>
      <div className="mt-5 flex flex-col gap-2 text-center text-sm">
        {mode === "login" ? (
          <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => setMode("forgot")}>
            Pamiršote slaptažodį?
          </button>
        ) : (
          <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => setMode("login")}>
            Grįžti į prisijungimą
          </button>
        )}
        {canSetup && mode === "login" ? (
          <button type="button" className="text-primary hover:underline" onClick={() => setMode("setup")}>
            Sukurti pirmąjį administratorių
          </button>
        ) : null}
      </div>
    </AuthShell>
  );
}
