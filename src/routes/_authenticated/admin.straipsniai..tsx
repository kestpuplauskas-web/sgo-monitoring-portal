import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink, ImagePlus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageBody, PageHeader, Panel } from "@/components/admin/ui";
import { ArticleBody, slugify } from "@/lib/article-body";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/admin/straipsniai/$id")({
  component: ArticleEditorPage,
});

function ArticleEditorPage() {
  const { id } = Route.useParams();
  const q = useQuery({
    queryKey: ["article", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("articles").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });
  if (q.isLoading) return <PageBody><Skeleton className="h-[600px]" /></PageBody>;
  if (!q.data) return <PageBody><p>Straipsnis nerastas. <Link to="/admin/straipsniai" className="text-primary underline">Grįžti</Link></p></PageBody>;
  return <Editor article={q.data} />;
}

function Editor({ article }: { article: Tables<"articles"> }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [f, setF] = useState({
    title: article.title, slug: article.slug, excerpt: article.excerpt, body: article.body, cover_url: article.cover_url,
    meta_title: article.meta_title, meta_description: article.meta_description, published: article.published,
  });
  const [slugTouched, setSlugTouched] = useState(!article.slug.startsWith("naujas-straipsnis-"));
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(false);
  useEffect(() => { if (!slugTouched) setF((x) => ({ ...x, slug: slugify(x.title) || x.slug })); }, [f.title, slugTouched]);

  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const slugOk = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(f.slug);
  const valid = f.title.trim().length > 2 && slugOk && (!f.published || f.body.trim().length > 0);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("articles").update({
        ...f,
        title: f.title.trim(),
        published_at: f.published ? article.published_at ?? new Date().toISOString() : article.published_at,
      }).eq("id", article.id);
      if (error) throw new Error(error.message.includes("duplicate") ? "Toks nuorodos adresas jau naudojamas." : "Nepavyko išsaugoti.");
    },
    onSuccess: () => {
      toast.success(f.published ? "Išsaugota ir publikuota sgo.lt" : "Juodraštis išsaugotas");
      qc.invalidateQueries({ queryKey: ["articles-admin"] });
      qc.invalidateQueries({ queryKey: ["article", article.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function remove() {
    const { error } = await supabase.from("articles").delete().eq("id", article.id);
    if (error) return toast.error("Nepavyko ištrinti");
    toast.success("Straipsnis ištrintas");
    qc.invalidateQueries({ queryKey: ["articles-admin"] });
    navigate({ to: "/admin/straipsniai" });
  }

  async function upload(file: File) {
    if (!file.type.startsWith("image/")) return toast.error("Pasirinkite paveikslėlį (JPG, PNG, WebP).");
    if (file.size > 5 * 1024 * 1024) return toast.error("Paveikslėlis per didelis – daugiausiai 5 MB.");
    setUploading(true);
    const path = `${article.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
    const { error } = await supabase.storage.from("articles").upload(path, file, { contentType: file.type });
    setUploading(false);
    if (error) return toast.error("Nepavyko įkelti paveikslėlio");
    const { data } = supabase.storage.from("articles").getPublicUrl(path);
    setF((x) => ({ ...x, cover_url: data.publicUrl }));
    toast.success("Paveikslėlis įkeltas – nepamirškite išsaugoti");
  }

  return (
    <>
      <PageHeader
        title={f.title || "Straipsnis"}
        description={f.published ? "Publikuotas – matomas svetainėje" : "Juodraštis – svetainėje nematomas"}
        actions={
          <>
            <Button variant="ghost" asChild><Link to="/admin/straipsniai"><ArrowLeft className="h-4 w-4" /> Visi straipsniai</Link></Button>
            {article.published ? (
              <Button variant="outline" asChild><a href={`/straipsniai/${article.slug}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /> Atidaryti</a></Button>
            ) : null}
            <Button disabled={!valid || save.isPending} onClick={() => save.mutate()}>{save.isPending ? "Saugoma…" : "Išsaugoti"}</Button>
          </>
        }
      />
      <PageBody className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="grid content-start gap-5">
          <Panel className="grid gap-4 p-6">
            <div className="grid gap-1.5"><Label htmlFor="a-title">Antraštė</Label><Input id="a-title" value={f.title} onChange={set("title")} className="h-11 text-base" /></div>
            <div className="grid gap-1.5"><Label htmlFor="a-ex">Įžanga (rodoma sąraše)</Label><Textarea id="a-ex" rows={2} value={f.excerpt} onChange={set("excerpt")} /></div>
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="a-body">Tekstas</Label>
                <button type="button" className="text-xs text-primary" onClick={() => setPreview(!preview)}>{preview ? "Redaguoti" : "Peržiūra"}</button>
              </div>
              {preview ? (
                <div className="rounded-lg border border-border p-5"><ArticleBody body={f.body || "_Tuščia_"} /></div>
              ) : (
                <Textarea id="a-body" rows={22} value={f.body} onChange={set("body")} className="font-mono text-sm leading-relaxed" />
              )}
              <p className="text-xs text-muted-foreground">
                Tuščia eilutė – nauja pastraipa. „## “ – paantraštė, „- “ – sąrašo punktas, **paryškinta**, [nuoroda](https://…).
              </p>
            </div>
          </Panel>
        </div>
        <div className="grid content-start gap-5">
          <Panel className="grid gap-4 p-5">
            <label className="flex items-center justify-between gap-3 text-sm font-semibold">
              Publikuoti svetainėje
              <Switch checked={f.published} onCheckedChange={(v) => setF({ ...f, published: v })} />
            </label>
            {f.published && !f.body.trim() ? <p className="text-xs text-destructive">Prieš publikuojant parašykite tekstą.</p> : null}
            <div className="grid gap-1.5">
              <Label htmlFor="a-slug">Nuorodos adresas</Label>
              <Input id="a-slug" value={f.slug} onChange={(e) => { setSlugTouched(true); setF({ ...f, slug: e.target.value }); }} aria-invalid={!slugOk} />
              <p className={slugOk ? "text-xs text-muted-foreground" : "text-xs text-destructive"}>
                {slugOk ? `sgo.lt/straipsniai/${f.slug}` : "Tik mažosios raidės be lietuviškų ženklų, skaičiai ir brūkšneliai."}
              </p>
            </div>
          </Panel>
          <Panel className="grid gap-3 p-5">
            <p className="text-sm font-semibold">Viršelio nuotrauka</p>
            {f.cover_url ? <img src={f.cover_url} alt="" className="aspect-[16/9] w-full rounded-lg object-cover" /> : <div className="flex aspect-[16/9] items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">Nėra nuotraukos</div>}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild disabled={uploading}>
                <label className="cursor-pointer">
                  <ImagePlus className="h-4 w-4" /> {uploading ? "Įkeliama…" : "Įkelti"}
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
                </label>
              </Button>
              {f.cover_url ? <Button variant="ghost" size="sm" onClick={() => setF({ ...f, cover_url: "" })}>Pašalinti</Button> : null}
            </div>
          </Panel>
          <Panel className="grid gap-3 p-5">
            <p className="text-sm font-semibold">Google paieškai</p>
            <div className="grid gap-1.5"><Label htmlFor="a-mt">Pavadinimas paieškoje</Label><Input id="a-mt" placeholder={f.title} value={f.meta_title} onChange={set("meta_title")} /><p className="text-xs text-muted-foreground">{(f.meta_title || f.title).length}/60 simbolių</p></div>
            <div className="grid gap-1.5"><Label htmlFor="a-md">Aprašymas paieškoje</Label><Textarea id="a-md" rows={3} placeholder={f.excerpt} value={f.meta_description} onChange={set("meta_description")} /><p className="text-xs text-muted-foreground">{(f.meta_description || f.excerpt).length}/160 simbolių</p></div>
          </Panel>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="justify-start text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /> Ištrinti straipsnį</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Ištrinti straipsnį?</AlertDialogTitle>
                <AlertDialogDescription>„{article.title}“ bus pašalintas iš svetainės visam laikui.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Atšaukti</AlertDialogCancel>
                <AlertDialogAction onClick={remove}>Ištrinti</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </PageBody>
    </>
  );
}
