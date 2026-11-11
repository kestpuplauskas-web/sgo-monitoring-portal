import { createFileRoute } from "@tanstack/react-router";
import { listPublishedArticles } from "@/lib/articles.functions";
import { SiteChrome } from "@/components/site/SiteChrome";

const TITLE = "Straipsniai apie saulės elektrinių priežiūrą | SGO";
const DESC = "Patarimai saulės elektrinių savininkams: gedimai, inverterių klaidos, gamybos nuostoliai, kaupikliai ir priežiūra.";

export const Route = createFileRoute("/straipsniai/")({
  loader: () => listPublishedArticles(),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://www.sgo.lt/straipsniai" }],
  }),
  component: ArticlesIndex,
});

function ArticlesIndex() {
  const list = Route.useLoaderData();
  return (
    <SiteChrome>
      <main className="mx-auto max-w-6xl px-5 py-14">
        <p className="font-mono text-[13px] font-semibold uppercase tracking-[0.12em] text-primary">Straipsniai</p>
        <h1 className="mt-3 max-w-3xl font-display text-4xl font-extrabold tracking-tight md:text-5xl">Patarimai saulės elektrinių savininkams</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">Kaip laiku pastebėti gedimą, neprarasti gamybos ir pasirūpinti, kad elektrinė veiktų visu pajėgumu.</p>
        {list.length === 0 ? (
          <p className="mt-12 text-muted-foreground">Straipsniai ruošiami – užsukite netrukus.</p>
        ) : (
          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((a) => (
              <li key={a.slug}>
                <a href={`/straipsniai/${a.slug}`} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary">
                  <div className="aspect-[16/9] bg-muted">
                    {a.cover_url ? <img src={a.cover_url} alt="" loading="lazy" width={640} height={360} className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h2 className="font-display text-lg font-bold group-hover:text-primary">{a.title}</h2>
                    {a.excerpt ? <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{a.excerpt}</p> : null}
                    <p className="mt-auto pt-4 font-mono text-xs text-muted-foreground">
                      {a.published_at ? new Date(a.published_at).toLocaleDateString("lt-LT") : ""}
                    </p>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </main>
    </SiteChrome>
  );
}
