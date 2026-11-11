import type { ReactNode } from "react";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <a href="/" className="mb-8 flex items-center justify-center gap-2" aria-label="SGO pradžia">
          <img src="/assets/sgo-logo-mark.webp" alt="" className="h-9 w-9" />
          <img src="/assets/sgo-logo-sgo.webp" alt="SGO" className="h-7 w-auto" />
        </a>
        <div className="rounded-2xl border border-border bg-card p-7 shadow-[0_0_40px_color-mix(in_oklab,var(--primary)_10%,transparent)]">
          <h1 className="font-display text-2xl font-extrabold">{title}</h1>
          {subtitle ? <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p> : null}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  );
}
