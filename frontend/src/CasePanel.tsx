import { useState } from "react";
import { Sprout, ArrowRight, LoaderCircle } from "lucide-react";
import { ChecklistSteps } from "./Checklist";
import { api } from "./api";
import Evidence from "./Evidence";
import {
  pick,
  type Case,
  type Session,
  type Lang,
} from "./types";
export default function CasePanel({
  data,
  session,
  lang,
  refresh,
  fail,
  onAsk,
}: {
  data: Case;
  session: Session;
  lang: Lang;
  refresh: () => Promise<void>;
  fail: (s: string) => void;
  onAsk: () => void;
}) {
  const [planning, setPlanning] = useState(false);
  async function makePlan() {
    setPlanning(true);
    try {
      await api(
        `/cases/${session.id}/plan`,
        { method: "POST", body: JSON.stringify({ language: lang }) },
        session,
      );
      await refresh();
    } catch (e) {
      fail((e as Error).message);
    } finally {
      setPlanning(false);
    }
  }
  const plan = data.plan?.result;
  const steps = plan?.checklist?.length
    ? plan.checklist
    : plan?.status === "answered"
      ? [...plan.claims, ...plan.actions].map((c) => c.text)
      : [];
  return (
    <>
      <div className="page-heading">
        <h1>
          {pick(
            lang,
            "Keep the next step in sight.",
            "அடுத்த படியைத் தெளிவாக அறியுங்கள்.",
          )}
        </h1>
        <p>
          {data.profile.district} · {pick(lang, "Paddy", "நெல்")} ·{" "}
          {data.profile.season}
        </p>
      </div>
      <section className="panel plan-panel">
        <div className="plan-head">
          <Sprout className="panel-icon" />
          <h2>{pick(lang, "Your checklist", "உங்கள் சரிபார்ப்புப் பட்டியல்")}</h2>
        </div>
        {steps.length ? (
          <ChecklistSteps caseId={session.id} steps={steps} lang={lang} />
        ) : (
          <p>
            {plan
              ? pick(lang, "We couldn't prepare a reliable plan from the sources this time.", "இந்த முறை ஆதாரங்களிலிருந்து நம்பகமான திட்டத்தைத் தயாரிக்க முடியவில்லை.")
              : data.profile.situation
                ? pick(lang, "Your plan hasn't been prepared yet.", "உங்கள் திட்டம் இன்னும் தயாரிக்கப்படவில்லை.")
                : pick(lang, "This case was started before plans existed.", "இந்த வழக்கு திட்ட வசதிக்கு முன் தொடங்கப்பட்டது.")}
          </p>
        )}
        <div className="plan-actions">
          {!steps.length && data.profile.situation && (
            <button className="secondary" onClick={() => void makePlan()} disabled={planning}>
              {planning ? <LoaderCircle className="spin" size={17} /> : <Sprout size={17} />}
              {plan ? pick(lang, "Try again", "மீண்டும் முயற்சி") : pick(lang, "Create my plan", "என் திட்டத்தை உருவாக்கு")}
            </button>
          )}
          <button className="primary" onClick={onAsk}>
            {pick(lang, "Ask Uzhav.ai a question", "உழவ்.ai-யிடம் கேளுங்கள்")}
            <ArrowRight size={17} />
          </button>
        </div>
      </section>
      <section className="panel review-results">
        <h2>{pick(lang, "Human review", "மனித மதிப்பாய்வு")}</h2>
        <p>
          {pick(
            lang,
            "A prototype reviewer can clarify uncertain answers. This is not a government grievance submission.",
            "மாதிரி மதிப்பாய்வாளர் தெளிவற்ற பதில்களை விளக்கலாம். இது அரசிடம் சமர்ப்பிக்கப்படும் குறை மனு அல்ல.",
          )}
        </p>
        {!data.reviews.length && (
          <p>
            {pick(
              lang,
              "No review requests yet.",
              "மதிப்பாய்வுக் கோரிக்கைகள் இல்லை.",
            )}
          </p>
        )}
        {data.reviews.map((r) => (
          <div key={r.id} className="review-result">
            <span className={"status " + r.state}>
              {r.state === "pending"
                ? pick(lang, "Pending review", "மதிப்பாய்வு நிலுவையில்")
                : pick(
                    lang,
                    "Reviewed by a person",
                    "மனிதரால் மதிப்பாய்வு செய்யப்பட்டது",
                  )}
            </span>
            <p>
              {r.response ||
                pick(
                  lang,
                  "Waiting for a reviewer.",
                  "மதிப்பாய்வாளருக்காகக் காத்திருக்கிறது.",
                )}
            </p>
            {r.state === "reviewed" && (
              <Evidence items={r.citations} lang={lang} />
            )}{" "}
          </div>
        ))}
        <button className="text-button" onClick={() => void refresh()}>
          {pick(
            lang,
            "Refresh review updates",
            "மதிப்பாய்வுத் தகவல்களைப் புதுப்பிக்கவும்",
          )}
        </button>
      </section>
    </>
  );
}
