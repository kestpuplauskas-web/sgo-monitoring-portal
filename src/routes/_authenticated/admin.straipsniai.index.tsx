import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Empty, PageBody, PageHeader, Panel, ltDate } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/admin/straipsniai/")({
  component: ArticlesList,
});

function ArticlesList() {
  const navigate = useNavigate();
  const list = useQuery({
    queryKey: ["articles-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("articles").select("id,slug,title,published,published_at,updated_at").order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function create() {
    const slug = `naujas-straipsnis-${Date.now().toString(36)}`;
    const { data, error } = await supabase.from("articles").insert({ title: "Naujas straipsnis", slug }).select("id").single();
    if (error || !data) return toast.error("Nepavyko sukurti straipsnio");
    navigate({ to: "/admin/straipsniai/$id", params: { id: data.id } });
  }

  return (
    <>
      <PageHeader
        title="Straipsniai"
        description="Publikuoti straipsniai rodomi sgo.lt/straipsniai ir pritraukia klientų iš Google paieškos."
        actions={<Button onClick={create}><Plus className="h-4 w-4" /> Naujas straipsnis</Button>}
      />
      <PageBody>
        {list.isLoading ? (
          <div className="grid gap-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : !list.data?.length ? (
          <Empty title="Straipsnių dar nėra">Parašykite pirmąjį – pvz. „Kodėl saulės elektrinė vasarą gamina mažiau?“</Empty>
        ) : (
          <Panel>
            <ul>
              {list.data.map((a) => (
                <li key={a.id} className="border-b border-border last:border-0">
                  <Link to="/admin/straipsniai/$id" params={{ id: a.id }} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-muted/40">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{a.title}</p>
                      <p className="truncate text-xs text-muted-foreground">sgo.lt/straipsniai/{a.slug}</p>
                    </div>
                    <div className="shrink-0 text-right text-xs">
                      {a.published ? (
                        <span className="rounded-full bg-primary/15 px-2.5 py-0.5 font-semibold text-primary">Publikuotas</span>
                      ) : (
                        <span className="rounded-full bg-muted px-2.5 py-0.5 font-semibold text-muted-foreground">Juodraštis</span>
                      )}
                      <p className="mt-1 text-muted-foreground">Keistas {ltDate(a.updated_at, false)}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </PageBody>
    </>
  );
}
