import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Bot, Hand, Send, CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Empty, PageBody, PageHeader, Panel, ltDate } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/chat")({
  validateSearch: z.object({ s: z.string().optional() }),
  head: () => ({ meta: [
    { title: "Chat komunikacija | SGO administravimas" },
    { name: "description", content: "SGO Asistento ir klientų pokalbiai realiu laiku." },
    { property: "og:title", content: "Chat komunikacija | SGO" },
    { property: "og:description", content: "SGO Asistento ir klientų pokalbiai realiu laiku." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: ChatPage,
});

type Session = { id: string; status: string; visitor_name: string; visitor_email: string; page: string; last_message: string; last_message_at: string };
type Msg = { id: string; role: string; content: string; created_at: string };

const STATUS: Record<string, { label: string; cls: string }> = {
  waiting: { label: "Laukia specialisto", cls: "bg-destructive/15 text-destructive" },
  human: { label: "Kalba specialistas", cls: "bg-primary/15 text-primary" },
  agent: { label: "Atsako asistentas", cls: "bg-muted text-muted-foreground" },
  closed: { label: "Užbaigtas", cls: "bg-muted text-muted-foreground" },
};
const ORDER: Record<string, number> = { waiting: 0, human: 1, agent: 2, closed: 3 };

function Pill({ status }: { status: string }) {
  const s = STATUS[status] ?? STATUS["agent"]!;
  return <span className={cn("inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold", s.cls)}>{s.label}</span>;
}

function ChatPage() {
  const { s: selected } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const qc = useQueryClient();

  const sessions = useQuery({
    queryKey: ["chat-sessions"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("chat_sessions")
        .select("id,status,visitor_name,visitor_email,page,last_message,last_message_at")
        .order("last_message_at", { ascending: false }).limit(200);
      if (error) throw error;
      return (data as Session[]).sort((a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9) || b.last_message_at.localeCompare(a.last_message_at));
    },
  });

  const select = (id?: string) => navigate({ search: id ? { s: id } : {} });
  const current = sessions.data?.find((x) => x.id === selected);

  return (
    <>
      <PageHeader title="Chat komunikacija" description="SGO Asistentas atsako automatiškai. Perimkite pokalbį, kai klientas prašo specialisto." />
      <PageBody>
        <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
          <Panel className={cn("overflow-hidden", selected && "hidden lg:block")}>
            {sessions.isLoading ? (
              <div className="grid gap-2 p-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}</div>
            ) : !sessions.data?.length ? (
              <p className="p-6 text-center text-sm text-muted-foreground">Pokalbių dar nėra. Jie atsiras, kai lankytojai parašys svetainės pokalbių langelyje.</p>
            ) : (
              <ul className="max-h-[70vh] divide-y divide-border overflow-y-auto">
                {sessions.data.map((x) => (
                  <li key={x.id}>
                    <button onClick={() => select(x.id)} className={cn("grid w-full gap-1 px-4 py-3 text-left hover:bg-muted/50", x.id === selected && "bg-muted")}>
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold">{x.visitor_name || "Lankytojas"}</span>
                        <Pill status={x.status} />
                      </span>
                      <span className="line-clamp-1 text-sm text-muted-foreground">{x.last_message}</span>
                      <span className="text-xs text-muted-foreground">{ltDate(x.last_message_at)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <div className={cn(!selected && "hidden lg:block")}>
            {current ? (
              <Conversation key={current.id} session={current} onBack={() => select()} onChanged={() => {
                qc.invalidateQueries({ queryKey: ["chat-sessions"] });
                qc.invalidateQueries({ queryKey: ["chat-waiting-count"] });
              }} />
            ) : (
              <Empty title="Pasirinkite pokalbį">Kairėje matysite visus pokalbius. Laukiantys specialisto rodomi viršuje.</Empty>
            )}
          </div>
        </div>
      </PageBody>
    </>
  );
}

function Conversation({ session, onBack, onChanged }: { session: Session; onBack: () => void; onChanged: () => void }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const key = ["chat-messages", session.id];

  const msgs = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from("chat_messages").select("id,role,content,created_at").eq("session_id", session.id).order("created_at");
      if (error) throw error;
      return data as Msg[];
    },
  });

  useEffect(() => {
    const ch = supabase.channel(`chat-msgs-${session.id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `session_id=eq.${session.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["chat-messages", session.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [session.id, qc]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [msgs.data?.length]);

  const setStatus = useMutation({
    mutationFn: async (status: string) => {
      const note = status === "human" ? "Prie pokalbio prisijungė SGO specialistas." : status === "agent" ? "Pokalbį vėl tęsia SGO Asistentas." : "Pokalbis užbaigtas. Ačiū, kad kreipėtės!";
      const { error } = await supabase.from("chat_sessions").update({ status }).eq("id", session.id);
      if (error) throw error;
      await supabase.from("chat_messages").insert({ session_id: session.id, role: "system", content: note });
    },
    onSuccess: (_d, status) => {
      toast.success(status === "human" ? "Pokalbį perėmėte" : status === "agent" ? "Grąžinta asistentui" : "Pokalbis užbaigtas");
      onChanged();
    },
    onError: () => toast.error("Nepavyko pakeisti būsenos"),
  });

  const send = useMutation({
    mutationFn: async (content: string) => {
      if (session.status !== "human") {
        const { error } = await supabase.from("chat_sessions").update({ status: "human" }).eq("id", session.id);
        if (error) throw error;
      }
      const { error } = await supabase.from("chat_messages").insert({ session_id: session.id, role: "admin", content });
      if (error) throw error;
      await supabase.from("chat_sessions").update({ last_message: content, last_message_at: new Date().toISOString() }).eq("id", session.id);
    },
    onSuccess: () => { setText(""); onChanged(); qc.invalidateQueries({ queryKey: key }); },
    onError: () => toast.error("Žinutė neišsiųsta. Bandykite dar kartą."),
  });

  const submit = () => { const t = text.trim(); if (t && !send.isPending) send.mutate(t); };

  return (
    <Panel className="flex h-[75vh] flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <Button variant="ghost" size="icon" className="h-11 w-11 lg:hidden" onClick={onBack} aria-label="Atgal į sąrašą"><ArrowLeft className="h-5 w-5" /></Button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{session.visitor_name || "Lankytojas"}</p>
          <p className="truncate text-xs text-muted-foreground">{[session.visitor_email, session.page].filter(Boolean).join(" · ") || "Kontaktai nepateikti"}</p>
        </div>
        <Pill status={session.status} />
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          {session.status !== "human" ? (
            <Button size="sm" onClick={() => setStatus.mutate("human")} disabled={setStatus.isPending}><Hand className="h-4 w-4" /> Perimti pokalbį</Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setStatus.mutate("agent")} disabled={setStatus.isPending}><Bot className="h-4 w-4" /> Grąžinti asistentui</Button>
          )}
          {session.status !== "closed" ? (
            <Button size="sm" variant="ghost" onClick={() => setStatus.mutate("closed")} disabled={setStatus.isPending}><CheckCircle2 className="h-4 w-4" /> Užbaigti</Button>
          ) : null}
        </div>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto bg-muted/30 p-4" aria-live="polite">
        {msgs.isLoading ? <Skeleton className="h-20" /> : msgs.data?.map((m) => (
          m.role === "system" ? (
            <p key={m.id} className="text-center text-xs text-muted-foreground">{m.content}</p>
          ) : (
            <div key={m.id} className={cn("flex", m.role === "visitor" ? "justify-start" : "justify-end")}>
              <div className={cn("max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm",
                m.role === "visitor" ? "bg-card border border-border" : m.role === "admin" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground")}>
                <span className="mb-0.5 block text-[11px] font-semibold opacity-75">
                  {m.role === "visitor" ? "Klientas" : m.role === "admin" ? "Jūs (specialistas)" : "SGO Asistentas"} · {ltDate(m.created_at).slice(-5)}
                </span>
                {m.content}
              </div>
            </div>
          )
        ))}
        <div ref={endRef} />
      </div>
      <form className="flex gap-2 border-t border-border p-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
          rows={2}
          placeholder={session.status === "human" ? "Rašykite klientui…" : "Parašius, pokalbį perimsite iš asistento…"}
          aria-label="Atsakymas klientui"
          className="min-h-11 resize-none"
        />
        <Button type="submit" size="icon" className="h-11 w-11 shrink-0 self-end" disabled={!text.trim() || send.isPending} aria-label="Siųsti"><Send className="h-4 w-4" /></Button>
      </form>
    </Panel>
  );
}
