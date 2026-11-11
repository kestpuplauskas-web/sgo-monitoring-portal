import { PlanOrderButton } from "@/components/site/PlanOrderDialog";
import { useEffect, type ReactNode } from "react";

export function SiteChrome({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Same page view beacon the static pages send.
    let vid = localStorage.getItem("sgo_vid");
    if (!vid) {
      vid = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("sgo_vid", vid);
    }
    navigator.sendBeacon?.(
      "/api/public/track",
      JSON.stringify({ path: location.pathname, referrer: document.referrer, vid }),
    );
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <a href="/" className="flex items-center gap-2" aria-label="SGO pradžia">
            <img src="/assets/sgo-logo-mark.webp" alt="" className="h-8 w-8" />
            <img src="/assets/sgo-logo-sgo.webp" alt="SGO" className="h-6 w-auto" />
          </a>
          <nav className="hidden items-center gap-6 font-mono text-sm font-semibold md:flex" aria-label="Pagrindinis meniu">
            <a href="/#planai" className="hover:text-primary">Planai</a>
            <a href="/monitoringas/" className="hover:text-primary">Monitoringas</a>
            <a href="/diagnostika/" className="hover:text-primary">Diagnostika</a>
            <a href="/servisas/" className="hover:text-primary">Servisas</a>
            <a href="/straipsniai" className="text-primary">Straipsniai</a>
          </nav>
          <PlanOrderButton className="inline-flex min-h-10 items-center rounded-full bg-primary px-5 font-mono text-sm font-bold text-primary-foreground">
            Pasirinkti planą
          </PlanOrderButton>
        </div>
      </header>
      {children}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} SGO · Saulės elektrinių priežiūra visoje Lietuvoje</p>
          <p className="flex gap-4">
            <a href="tel:+37060606222" className="hover:text-foreground">+370 606 06222</a>
            <a href="mailto:info@sgo.lt" className="hover:text-foreground">info@sgo.lt</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
