import { ExternalLink, BookOpen, ChevronDown } from "lucide-react";
import { pick, type Evidence as Item, type Lang } from "./types";
export function Citations({ ids, items }: { ids: string[]; items: Item[] }) {
  return (
    <span className="inline-citations">
      {ids.map((id) => {
        const index = items.findIndex((e) => e.id === id);
        const e = items[index];
        return e ? (
          <a
            key={id}
            href={e.url + (e.page ? "#page=" + e.page : "")}
            target="_blank"
            rel="noreferrer"
            title={`${e.title}${e.page ? " · Page " + e.page : ""}`}
          >
            [{index + 1}]
          </a>
        ) : null;
      })}
    </span>
  );
}
export default function Evidence({
  items,
  lang,
}: {
  items: Item[];
  lang: Lang;
}) {
  return (
    <section className="evidence">
      <div className="section-label">
        <BookOpen size={17} />
        {pick(lang, "Retrieved evidence", "கண்டறியப்பட்ட ஆதாரம்")}{" "}
        <span>{items.length}</span>
      </div>
      {items.map((e, i) => (
        <details key={e.id} className="source" open={i === 0}>
          <summary>
            <span className="source-number">{i + 1}</span>
            <span>
              <strong>{e.title}</strong>
              <small>
                {e.page
                  ? pick(lang, `Page ${e.page}`, `பக்கம் ${e.page}`)
                  : pick(lang, "Official webpage", "அரசு இணையப் பக்கம்")}{" "}
                · {e.kind}
              </small>
            </span>
            <ChevronDown size={15} />
          </summary>
          <blockquote>{e.text}</blockquote>
          <footer>
            <a
              href={e.url + (e.page ? "#page=" + e.page : "")}
              target="_blank"
              rel="noreferrer"
            >
              {pick(lang, "Open original", "மூல ஆவணம்")}{" "}
              <ExternalLink size={13} />
            </a>
            <small>
              {pick(lang, "Retrieved", "பெறப்பட்டது")}{" "}
              {e.retrieved_at.slice(0, 10)}
            </small>
          </footer>
          <code>{e.id}</code>
        </details>
      ))}
    </section>
  );
}
