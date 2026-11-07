import { CheckCircle2 } from "lucide-react";
import Evidence, { Citations } from "./Evidence";
import { pick, type Lang, type Result } from "./types";

/** Conversational text: paragraphs, with [n] markers shown as source badges (evidence n). */
function Prose({ text, result }: { text: string; result: Result }) {
  return (
    <>
      {text.split(/\n{2,}/).map((para, i) => (
        <p className="answer-copy" key={i}>
          {para.split(/(\[\d+\])/).map((part, j) => {
            const m = part.match(/^\[(\d+)\]$/);
            const e = m ? result.evidence[Number(m[1]) - 1] : undefined;
            if (m && !e) return null;
            return e ? <Citations key={j} ids={[e.id]} items={result.evidence} /> : part;
          })}
        </p>
      ))}
    </>
  );
}

/** Compact answer layout shared by the chat and the plan on My case. */
export default function AnswerBody({ result, lang }: { result: Result; lang: Lang }) {
  const cited = [...result.claims, ...result.actions].flatMap((c) => c.citation_ids);
  return (
    <>
      {result.claims.length ? (
        result.claims.map((c, i) => (
          <p className="answer-copy" key={i}>
            {c.text} <Citations ids={c.citation_ids} items={result.evidence} />
          </p>
        ))
      ) : (
        <Prose text={result.answer} result={result} />
      )}
      {!!result.actions.length && (
        <div className="next-actions">
          <strong>{pick(lang, "Next steps", "அடுத்த படிகள்")}</strong>
          {result.actions.map((a, i) => (
            <p key={i}>
              <CheckCircle2 size={16} />
              <span>
                {a.text} <Citations ids={a.citation_ids} items={result.evidence} />
              </span>
            </p>
          ))}
        </div>
      )}
      {!!result.missing_information.length && (
        <p className="answer-note">
          {pick(lang, "For more specific advice: ", "மேலும் துல்லியமான வழிகாட்டுதலுக்கு: ")}
          {result.missing_information.join(" · ")}
        </p>
      )}
      <Evidence items={result.evidence} lang={lang} only={cited} />
    </>
  );
}
