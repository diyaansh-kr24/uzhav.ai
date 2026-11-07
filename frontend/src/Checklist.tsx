import { useEffect, useState } from "react";
import { Check, X, ArrowRight, Sprout } from "lucide-react";
import { pick, type Lang } from "./types";

const key = (caseId: string) => "uzhav-checklist:" + caseId;

function loadDone(caseId: string): number[] {
  try {
    const v = JSON.parse(localStorage.getItem(key(caseId)) || "[]");
    return Array.isArray(v) ? v.filter((n) => typeof n === "number") : [];
  } catch {
    return [];
  }
}

/** Tickable checklist. Ticks are remembered per case on this device. */
export function ChecklistSteps({ caseId, steps, lang }: { caseId: string; steps: string[]; lang: Lang }) {
  const [done, setDone] = useState<number[]>(() => loadDone(caseId));
  function toggle(i: number) {
    const next = done.includes(i) ? done.filter((n) => n !== i) : [...done, i];
    setDone(next);
    try {
      localStorage.setItem(key(caseId), JSON.stringify(next));
    } catch {
      /* storage unavailable: ticks last for this visit only */
    }
  }
  const count = done.filter((i) => i < steps.length).length;
  return (
    <>
      <div className="checklist-progress">
        <span>
          {pick(lang, `${count} of ${steps.length} done`, `${steps.length}-இல் ${count} முடிந்தது`)}
        </span>
        <div aria-hidden>
          <span style={{ width: `${(count / Math.max(steps.length, 1)) * 100}%` }} />
        </div>
      </div>
      <ol className="checklist">
        {steps.map((s, i) => (
          <li key={i}>
            <button
              className={"checklist-item " + (done.includes(i) ? "done" : "")}
              aria-pressed={done.includes(i)}
              onClick={() => toggle(i)}
            >
              <span className="tick">{done.includes(i) ? <Check size={15} /> : i + 1}</span>
              <span>{s}</span>
            </button>
          </li>
        ))}
      </ol>
    </>
  );
}

export default function ChecklistModal({
  caseId,
  steps,
  lang,
  onClose,
  onAsk,
}: {
  caseId: string;
  steps: string[];
  lang: Lang;
  onClose: () => void;
  onAsk: () => void;
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="checklist-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close icon-button" aria-label={pick(lang, "Close", "மூடு")} onClick={onClose}>
          <X size={18} />
        </button>
        <div className="modal-head">
          <span className="modal-mark"><Sprout size={22} /></span>
          <div>
            <h2 id="checklist-title">{pick(lang, "Your checklist", "உங்கள் சரிபார்ப்புப் பட்டியல்")}</h2>
            <p>{pick(lang, "Tick each step as you finish it.", "ஒவ்வொரு படியையும் முடித்ததும் குறியிடுங்கள்.")}</p>
          </div>
        </div>
        <ChecklistSteps caseId={caseId} steps={steps} lang={lang} />
        <button className="primary large modal-cta" onClick={onAsk}>
          {pick(lang, "Ask Uzhav.ai a question", "உழவ்.ai-யிடம் கேளுங்கள்")}
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
