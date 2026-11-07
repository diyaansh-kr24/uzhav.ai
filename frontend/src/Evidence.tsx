import { ExternalLink, BookOpen } from "lucide-react";
import { pick, type Evidence as Item, type Lang } from "./types";

const link = (e: Item) => e.url + (e.page ? "#page=" + e.page : "");

export function Citations({ ids, items }: { ids: string[]; items: Item[] }) {
  return (
    <span className="inline-citations">
      {ids.map((id) => {
        const index = items.findIndex((e) => e.id === id);
        const e = items[index];
        return e ? (
          <a
            key={id}
            href={link(e)}
            target="_blank"
            rel="noreferrer"
            title={`${e.title}${e.page ? " · Page " + e.page : ""}`}
          >
            {index + 1}
          </a>
        ) : null;
      })}
    </span>
  );
}

/** Compact, collapsed source list. `only` limits it to cited ids, keeping original numbers. */
export default function Evidence({
  items,
  lang,
  only,
}: {
  items: Item[];
  lang: Lang;
  only?: string[];
}) {
  const shown = items
    .map((e, i) => ({ e, n: i + 1 }))
    .filter(({ e }) => !only?.length || only.includes(e.id));
  if (!shown.length) return null;
  return (
    <details className="sources-compact">
      <summary>
        <BookOpen size={15} />
        {pick(lang, "Sources", "ஆதாரங்கள்")} ({shown.length})
      </summary>
      <ul>
        {shown.map(({ e, n }) => (
          <li key={e.id}>
            <span className="source-number">{n}</span>
            <span className="source-title" title={e.text.slice(0, 400)}>
              {e.title}
              {e.page ? (
                <small>{pick(lang, ` · p. ${e.page}`, ` · பக். ${e.page}`)}</small>
              ) : null}
            </span>
            <a href={link(e)} target="_blank" rel="noreferrer">
              {pick(lang, "Open", "திற")} <ExternalLink size={12} />
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
