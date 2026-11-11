import type { ReactNode } from "react";

// Renders simple article text: blank line = new paragraph, "## " / "### " = subheadings,
// "- " = bullet list, **bold**, [text](https://link). No raw HTML is ever rendered.
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]*)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(<strong key={i++}>{m[1]}</strong>);
    else out.push(<a key={i++} href={m[3]} className="text-primary underline underline-offset-2">{m[2]}</a>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function ArticleBody({ body }: { body: string }) {
  const blocks = body.replace(/\r/g, "").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="grid gap-5 text-[17px] leading-[1.75] text-foreground/90">
      {blocks.map((b, i) => {
        if (b.startsWith("### ")) return <h3 key={i} className="mt-4 font-display text-xl font-bold text-foreground">{inline(b.slice(4))}</h3>;
        if (b.startsWith("## ")) return <h2 key={i} className="mt-6 font-display text-2xl font-extrabold text-foreground">{inline(b.slice(3))}</h2>;
        const lines = b.split("\n");
        if (lines.every((l) => l.startsWith("- "))) {
          return (
            <ul key={i} className="grid list-disc gap-2 pl-6 marker:text-primary">
              {lines.map((l, j) => <li key={j}>{inline(l.slice(2))}</li>)}
            </ul>
          );
        }
        return <p key={i}>{lines.map((l, j) => <span key={j}>{j ? <br /> : null}{inline(l)}</span>)}</p>;
      })}
    </div>
  );
}

export function slugify(s: string) {
  const map: Record<string, string> = { ą: "a", č: "c", ę: "e", ė: "e", į: "i", š: "s", ų: "u", ū: "u", ž: "z" };
  return s
    .toLowerCase()
    .replace(/[ąčęėįšųūž]/g, (c) => map[c] ?? c)
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}
