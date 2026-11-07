import { useEffect, useState } from "react";
import { ExternalLink, FileText, Archive } from "lucide-react";
import { api } from "./api";
import { pick, type Lang } from "./types";
type Source = {
  id: string;
  title: string;
  url: string;
  note: string;
  kind: string;
  districts: string[];
  retrieved_at: string;
  sha256: string;
  status: string;
  chunk_count: number;
};
export default function Sources({ lang }: { lang: Lang }) {
  const [sources, setSources] = useState<Source[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    api<Source[]>("/sources")
      .then(setSources)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <>
      <div className="page-heading">
        <div className="eyebrow">
          {pick(lang, "THE EVIDENCE LIBRARY", "ஆதார நூலகம்")}
        </div>
        <h1>
          {pick(
            lang,
            "Official sources. Visible provenance.",
            "அரசு ஆதாரங்கள். தெளிவான மூலங்கள்.",
          )}
        </h1>
        <p>
          {pick(
            lang,
            "General rules and district directories are indexed separately from historical notices. No current village-level notification has been loaded.",
            "பொது விதிகள், மாவட்டத் தொடர்புகள் மற்றும் பழைய அறிவிப்புகள் தனித்தனியாக வகைப்படுத்தப்பட்டுள்ளன. தற்போதைய கிராம அளவிலான அறிவிப்பு ஏற்றப்படவில்லை.",
          )}
        </p>
      </div>
      {error && <div className="error">{error}</div>}
      <div className="sources-grid">
        {sources.map((s) => (
          <article className="panel source-card" key={s.id}>
            {s.kind === "archive" ? (
              <Archive className="panel-icon" />
            ) : (
              <FileText className="panel-icon" />
            )}
            <span className="pill">
              {s.districts.join(", ")} · {s.kind}
            </span>
            <h2>{s.title}</h2>
            <p>{s.note}</p>
            <dl>
              <dt>{pick(lang, "Index status", "குறியீட்டு நிலை")}</dt>
              <dd>
                {s.status} · {s.chunk_count || 0}{" "}
                {pick(lang, "passages", "பத்திகள்")}
              </dd>
              <dt>{pick(lang, "Retrieved", "பெறப்பட்டது")}</dt>
              <dd>{s.retrieved_at.slice(0, 10)}</dd>
            </dl>
            <a href={s.url} target="_blank" rel="noreferrer">
              {pick(lang, "Read official source", "அரசு ஆதாரத்தைப் படிக்கவும்")}
              <ExternalLink size={16} />
            </a>
            <details>
              <summary>SHA-256</summary>
              <code>{s.sha256}</code>
            </details>
          </article>
        ))}
      </div>
    </>
  );
}
