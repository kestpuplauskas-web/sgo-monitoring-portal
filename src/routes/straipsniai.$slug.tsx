import { PlanOrderButton } from "@/components/site/PlanOrderDialog";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { getPublishedArticle } from "@/lib/articles.functions";
import { SiteChrome } from "@/components/site/SiteChrome";
import { ArticleBody } from "@/lib/article-body";

export const Route = createFileRoute("/straipsniai/$slug")({
  loader: async ({ params }) => {
    const a = await getPublishedArticle({ data: { slug: params.slug } });
    if (!a) throw notFound();
    return a;
  },
  head: ({ loaderData: a, params }) => {
    if (!a) return { meta: [{ title: "Straipsnis nerastas | SGO" }, { name: "robots", content: "noindex" }] };
    const title = (a.meta_title || a.title) + " | SGO";
    const desc = a.meta_description || a.excerpt;
    const img = a.cover_url.startsWith("https://") ? a.cover_url : "";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(img ? [{ property: "og:image", content: img }, { name: "twitter:image", content: img }] : []),
      ],
      links: [{ rel: "canonical", href: `https://www.sgo.lt/straipsniai/${params.slug}` }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: a.title,
            description: desc,
            datePublished: a.published_at,
            ...(img ? { image: img } : {}),
            publisher: { "@type": "Organization", name: "SGO", url: "https://www.sgo.lt/" },
          }),
        },
      ],
    };
  },
  notFoundComponent: () => (
    <SiteChrome>
      <main className="mx-auto max-w-3xl px-5 py-24 text-center">
        <h1 className="font-display text-3xl font-extrabold">Straipsnis nerastas</h1>
        <a href="/straipsniai" className="mt-6 inline-block text-primary underline">Visi straipsniai</a>
      </main>
    </SiteChrome>
  ),
  component: ArticlePage,
});

function ArticlePage() {
  const a = Route.useLoaderData();
  return (
    <SiteChrome>
      <main>
        <article className="mx-auto max-w-3xl px-5 py-14">
          <a href="/straipsniai" className="font-mono text-sm text-muted-foreground hover:text-primary">← Visi straipsniai</a>
          <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">{a.title}</h1>
          {a.published_at ? <p className="mt-4 font-mono text-sm text-muted-foreground">{new Date(a.published_at).toLocaleDateString("lt-LT")}</p> : null}
          {a.excerpt ? <p className="mt-6 text-xl leading-relaxed text-muted-foreground">{a.excerpt}</p> : null}
          {a.cover_url ? <img src={a.cover_url} alt="" width={1200} height={675} fetchPriority="high" className="mt-8 aspect-[16/9] w-full rounded-2xl object-cover" /> : null}
          <div className="mt-10"><ArticleBody body={a.body} /></div>
          <aside className="mt-14 rounded-2xl border border-primary/40 bg-card p-7">
            <p className="font-display text-2xl font-extrabold">Norite, kad elektrinė veiktų be rūpesčių?</p>
            <p className="mt-2 text-muted-foreground">Stebime jūsų elektrinę 24/7 ir pranešame apie sutrikimus laiku. Planai nuo 0 € / mėn.</p>
            <PlanOrderButton className="mt-5 inline-flex min-h-11 items-center rounded-full bg-primary px-6 font-mono text-sm font-bold text-primary-foreground">Pasirinkti planą</PlanOrderButton>
          </aside>
        </article>
      </main>
    </SiteChrome>
  );
}
