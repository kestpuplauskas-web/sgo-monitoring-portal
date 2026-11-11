import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { inviteStaff, listStaff, removeStaff, setStaffRole } from "@/lib/users.functions";
import { ROLE_HINTS, ROLE_LABELS, canAccess, type AppRole } from "@/lib/admin-roles";
import { useMyRoles } from "@/lib/use-my-roles";
import { Empty, PageBody, PageHeader, Panel, ltDate } from "@/components/admin/ui";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/admin/vartotojai")({
  head: () => ({ meta: [
    { title: "Vartotojai | SGO administravimas" },
    { name: "description", content: "Vartotojai SGO valdymo sistemoje." },
    { property: "og:title", content: "Vartotojai | SGO" },
    { property: "og:description", content: "Vartotojai SGO valdymo sistemoje." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: UsersPage,
});

const ROLES: AppRole[] = ["admin", "manager", "editor"];

function UsersPage() {
  const me = useMyRoles();
  const isAdmin = canAccess(me.data?.roles ?? [], "users");
  const qc = useQueryClient();
  const list = useServerFn(listStaff);
  const invite = useServerFn(inviteStaff);
  const setRole = useServerFn(setStaffRole);
  const remove = useServerFn(removeStaff);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRoleSel] = useState<AppRole>("manager");

  const staff = useQuery({ queryKey: ["staff"], queryFn: () => list(), enabled: isAdmin });
  const refresh = () => qc.invalidateQueries({ queryKey: ["staff"] });

  const inv = useMutation({
    mutationFn: () => invite({ data: { email, name, role, redirectTo: `${window.location.origin}/admin/slaptazodis` } }),
    onSuccess: () => { toast.success(`Kvietimas išsiųstas: ${email}`); setEmail(""); setName(""); refresh(); },
    onError: (e: Error) => toast.error(e.message || "Nepavyko pakviesti"),
  });
  const chg = useMutation({
    mutationFn: (v: { userId: string; role: AppRole }) => setRole({ data: v }),
    onSuccess: () => { toast.success("Rolė pakeista"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (userId: string) => remove({ data: { userId } }),
    onSuccess: () => { toast.success("Prieiga panaikinta"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isAdmin) return <PageBody><Empty title="Šis puslapis skirtas tik administratoriui" /></PageBody>;

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  function submit(e: FormEvent) { e.preventDefault(); if (emailOk) inv.mutate(); }

  return (
    <>
      <PageHeader title="Vartotojai" description="Pakvieskite komandos narius ir nurodykite, ką jie gali matyti." />
      <PageBody className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          {staff.isLoading ? (
            <div className="grid gap-2">{[0, 1].map((i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : staff.isError ? (
            <Empty title="Nepavyko gauti vartotojų sąrašo"><button className="text-primary underline" onClick={() => staff.refetch()}>Bandyti dar kartą</button></Empty>
          ) : (
            <Panel>
              <ul>
                {staff.data?.map((u) => (
                  <li key={u.id} className="grid min-w-0 gap-3 sm:flex sm:items-center sm:justify-between border-b border-border px-5 py-4 last:border-0">
                    <div className="min-w-0 sm:flex-1">
                      <p className="truncate font-semibold">{u.name || u.email}{u.isMe ? <span className="ml-2 text-xs text-muted-foreground">(jūs)</span> : null}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {u.name ? `${u.email} · ` : ""}{u.invited ? "Kvietimas dar nepriimtas" : `Paskutinį kartą prisijungė ${ltDate(u.lastSignIn)}`}
                      </p>
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex">
                      <Select value={u.roles[0] ?? "editor"} onValueChange={(v) => chg.mutate({ userId: u.id, role: v as AppRole })} disabled={u.isMe}>
                        <SelectTrigger className="h-11 w-full sm:w-44" aria-label="Rolė"><SelectValue /></SelectTrigger>
                        <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
                      </Select>
                      {!u.isMe ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">Pašalinti</Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Panaikinti prieigą?</AlertDialogTitle>
                              <AlertDialogDescription>{u.email} nebegalės prisijungti prie valdymo sistemos. Vėliau galėsite pakviesti iš naujo.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Atšaukti</AlertDialogCancel>
                              <AlertDialogAction onClick={() => del.mutate(u.id)}>Panaikinti</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
        <Panel className="h-fit p-4 sm:p-6">
          <p className="flex items-center gap-2 font-display text-lg font-bold"><UserPlus className="h-5 w-5 text-primary" /> Pakviesti vartotoją</p>
          <form onSubmit={submit} className="mt-4 grid gap-4">
            <div className="grid gap-1.5"><Label htmlFor="i-email">El. paštas</Label><Input id="i-email" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label htmlFor="i-name">Vardas (neprivaloma)</Label><Input id="i-name" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="grid gap-1.5">
              <Label>Rolė</Label>
              <Select value={role} onValueChange={(v) => setRoleSel(v as AppRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{ROLE_HINTS[role]}</p>
            </div>
            <Button type="submit" disabled={!emailOk || inv.isPending}>{inv.isPending ? "Siunčiama…" : "Siųsti kvietimą"}</Button>
            <p className="text-xs text-muted-foreground">Vartotojas gaus laišką su nuoroda slaptažodžiui nustatyti.</p>
          </form>
        </Panel>
      </PageBody>
    </>
  );
}
