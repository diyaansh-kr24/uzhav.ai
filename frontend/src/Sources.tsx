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
// Plain-language summaries shown to farmers (the manifest's notes are internal).
const SUMMARY: Record<string, [string, string]> = {
  "pmfby-2023": [
    "The main rulebook for the PM crop insurance scheme: who can join, how to report a loss and how claims are settled.",
    "பிரதமர் பயிர்க் காப்பீட்டுத் திட்டத்தின் முதன்மை விதிமுறைகள்: யார் சேரலாம், இழப்பை எப்படிப் பதிவு செய்வது, கோரிக்கைகள் எப்படித் தீர்க்கப்படுகின்றன.",
  ],
  "pib-grievance": [
    "A government note on how applications are checked and where farmers can raise a complaint.",
    "விண்ணப்பங்கள் எப்படிச் சரிபார்க்கப்படுகின்றன, விவசாயிகள் எங்கே புகார் அளிக்கலாம் என்பது பற்றிய அரசுக் குறிப்பு.",
  ],
  "thanjavur-agri": [
    "Contacts and services from the Thanjavur district agriculture office.",
    "தஞ்சாவூர் மாவட்ட வேளாண்மை அலுவலகத்தின் தொடர்புகளும் சேவைகளும்.",
  ],
  "tiruvarur-agri": [
    "Contacts and services from the Tiruvarur district agriculture office.",
    "திருவாரூர் மாவட்ட வேளாண்மை அலுவலகத்தின் தொடர்புகளும் சேவைகளும்.",
  ],
  "nagapattinam-agri": [
    "Contacts and services from the Nagapattinam district agriculture office.",
    "நாகப்பட்டினம் மாவட்ட வேளாண்மை அலுவலகத்தின் தொடர்புகளும் சேவைகளும்.",
  ],
  "tn-tender-2024": [
    "Older Tamil Nadu insurance contract papers, kept for reference only. Not used for answers.",
    "பழைய தமிழ்நாடு காப்பீட்டு ஒப்பந்த ஆவணங்கள், குறிப்புக்காக மட்டும். பதில்களுக்குப் பயன்படுத்தப்படுவதில்லை.",
  ],
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
        <h1>
          {pick(
            lang,
            "Official sources. Visible provenance.",
            "அரசு ஆதாரங்கள். தெளிவான மூலங்கள்.",
          )}
        </h1>
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
            <h2>{s.title}</h2>
            <p>{SUMMARY[s.id] ? pick(lang, SUMMARY[s.id][0], SUMMARY[s.id][1]) : s.note}</p>
            <dl>
              <dt>{pick(lang, "Last verified", "கடைசியாகச் சரிபார்த்தது")}</dt>
              <dd>
                {new Date(s.retrieved_at).toLocaleDateString(lang === "ta" ? "ta-IN" : "en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </dd>
            </dl>
            <a href={s.url} target="_blank" rel="noreferrer">
              {pick(lang, "Read official source", "அரசு ஆதாரத்தைப் படிக்கவும்")}
              <ExternalLink size={16} />
            </a>
          </article>
        ))}
      </div>
    </>
  );
}
