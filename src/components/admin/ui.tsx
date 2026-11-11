import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="grid min-w-0 gap-4 border-b border-border px-4 py-5 sm:flex sm:items-end sm:justify-between sm:px-6 lg:px-10">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-extrabold break-words lg:text-3xl">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="grid min-w-0 grid-cols-1 gap-2 [&>a]:min-h-11 sm:flex sm:flex-wrap">{actions}</div> : null}
    </div>
  );
}

export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("min-w-0 px-4 py-5 sm:px-6 lg:px-10", className)}>{children}</div>;
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("min-w-0 rounded-lg border border-border bg-card", className)}>{children}</div>;
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <Panel className="p-4 sm:p-5">
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </Panel>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Panel className="px-6 py-14 text-center">
      <p className="font-display text-lg font-bold">{title}</p>
      {children ? <div className="mt-2 text-sm text-muted-foreground">{children}</div> : null}
    </Panel>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    nauja: "bg-primary/15 text-primary",
    susisiekta: "bg-warning/15 text-warning",
    aktyvuota: "bg-chart-2/20 text-chart-2",
    atsaukta: "bg-destructive/15 text-destructive",
  };
  const label: Record<string, string> = { nauja: "Nauja", susisiekta: "Susisiekta", aktyvuota: "Aktyvuota", atsaukta: "Atšaukta", uzdaryta: "Uždaryta", perziureta: "Peržiūrėta" };
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", map[status] ?? "bg-muted text-muted-foreground")}>
      {label[status] ?? status}
    </span>
  );
}

export const ltDate = (d: string | null | undefined, withTime = true) =>
  d
    ? new Date(d).toLocaleString("lt-LT", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
      })
    : "—";
