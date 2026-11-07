import { FileCheck2, Download, Clock3, CheckCircle2 } from "lucide-react";
import { api, download } from "./api";
import Evidence from "./Evidence";
import {
  pick,
  stages,
  stageNames,
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
}: {
  data: Case;
  session: Session;
  lang: Lang;
  refresh: () => Promise<void>;
  fail: (s: string) => void;
}) {
  const docs = [
    [
      "policy",
      "Insurance acknowledgement / policy",
      "காப்பீட்டு ஒப்புகை / பாலிசி",
    ],
    ["land", "Land or cultivation record", "நிலம் அல்லது சாகுபடிப் பதிவு"],
    ["sowing", "Crop / sowing details", "பயிர் / விதைப்பு விவரங்கள்"],
    [
      "bank",
      "Bank details, kept offline",
      "வங்கி விவரங்கள், இணையத்தில் சேமிக்கப்படாது",
    ],
    [
      "loss_photos",
      "Loss photos, kept offline",
      "இழப்பு புகைப்படங்கள், இணையத்தில் சேமிக்கப்படாது",
    ],
    ["acknowledgement", "Previous correspondence", "முந்தைய தொடர்பு ஆவணங்கள்"],
  ];
  async function update(field: string, value: unknown) {
    try {
      await api(
        `/cases/${session.id}`,
        {
          method: "PUT",
          body: JSON.stringify({ ...data.profile, [field]: value }),
        },
        session,
      );
      await refresh();
    } catch (e) {
      fail((e as Error).message);
    }
  }
  async function event(kind: string) {
    try {
      await api(
        `/cases/${session.id}/events`,
        { method: "POST", body: JSON.stringify({ kind }) },
        session,
      );
      await refresh();
    } catch (e) {
      fail((e as Error).message);
    }
  }
  async function draft() {
    try {
      const r = await fetch(`/api/cases/${session.id}/draft`, {
        headers: { Authorization: "Bearer " + session.token },
      });
      if (!r.ok) throw new Error("Could not prepare draft");
      download(await r.text(), "assistance-request-draft.txt");
    } catch (e) {
      fail((e as Error).message);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div className="eyebrow">
          {pick(lang, "YOUR CASE WORKSPACE", "உங்கள் வழக்கு பணியிடம்")}
        </div>
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
      <div className="journey-bar">
        {stages.map((s, i) => (
          <button
            key={s}
            className={data.profile.stage === s ? "active" : ""}
            onClick={() => void update("stage", s)}
          >
            <span>{i + 1}</span>
            {stageNames[s][lang === "ta" ? 1 : 0]}
          </button>
        ))}
      </div>
      <div className="two-columns">
        <section className="panel">
          <FileCheck2 className="panel-icon" />
          <h2>{pick(lang, "Document readiness", "ஆவணத் தயார்நிலை")}</h2>
          <p>
            {pick(
              lang,
              "A preparation aid, not an official mandatory-document list. Requirements depend on the applicable notification and case. We store checkmarks, never your documents.",
              "இது தயாரிப்புக்கான உதவி மட்டுமே; கட்டாய ஆவணப் பட்டியல் அல்ல. தேவைகள் பொருந்தும் அறிவிப்பைப் பொறுத்தவை. குறியீடுகள் மட்டுமே சேமிக்கப்படும்; ஆவணங்கள் அல்ல.",
            )}
          </p>
          {docs.map(([id, en, ta]) => (
            <label className="check-row" key={id}>
              <input
                type="checkbox"
                checked={data.profile.documents.includes(id)}
                onChange={(e) =>
                  void update(
                    "documents",
                    e.target.checked
                      ? [...data.profile.documents, id]
                      : data.profile.documents.filter((d) => d !== id),
                  )
                }
              />
              {pick(lang, en, ta)}
            </label>
          ))}
          <button
            className="secondary full"
            onClick={() => void event("documents_prepared")}
          >
            {pick(lang, "Record preparation", "தயாரிப்பைப் பதிவு செய்க")}
          </button>
        </section>
        <section className="panel">
          <Clock3 className="panel-icon" />
          <h2>{pick(lang, "Case diary", "வழக்குக் குறிப்பேடு")}</h2>
          <p>
            {pick(
              lang,
              "Your own record of actions. These entries are not official claim-status updates.",
              "இது உங்கள் செயல்களின் பதிவு. இவை அதிகாரப்பூர்வ கோரிக்கை நிலைத் தகவல்கள் அல்ல.",
            )}
          </p>
          {data.events.length ? (
            data.events.map((e, i) => (
              <div className="timeline-entry" key={i}>
                <CheckCircle2 size={17} />
                <div>
                  <strong>
                    {pick(
                      lang,
                      (
                        {
                          documents_prepared: "Documents prepared",
                          loss_reported: "Loss reported externally",
                          follow_up_recorded: "External follow-up recorded",
                          grievance_prepared: "Grievance prepared",
                        } as Record<string, string>
                      )[e.kind] || e.kind,
                      (
                        {
                          documents_prepared: "ஆவணங்கள் தயாரிக்கப்பட்டன",
                          loss_reported: "இழப்பு வெளியே பதிவு செய்யப்பட்டது",
                          follow_up_recorded:
                            "வெளிப்புறத் தொடர் விசாரணைப் பதிவு",
                          grievance_prepared: "குறை மனு தயாரிக்கப்பட்டது",
                        } as Record<string, string>
                      )[e.kind] || e.kind,
                    )}
                  </strong>
                  <small>{new Date(e.created).toLocaleString()}</small>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-inline">
              {pick(
                lang,
                "No actions recorded yet.",
                "செயல்கள் இன்னும் பதிவு செய்யப்படவில்லை.",
              )}
            </div>
          )}
          <div className="stack">
            <button
              className="secondary"
              onClick={() => void event("loss_reported")}
            >
              {pick(
                lang,
                "I reported my loss externally",
                "இழப்பை வெளியே பதிவு செய்தேன்",
              )}
            </button>
            <button
              className="secondary"
              onClick={() => void event("follow_up_recorded")}
            >
              {pick(
                lang,
                "Record an external follow-up",
                "வெளிப்புறத் தொடர் விசாரணைப் பதிவு",
              )}
            </button>
            <button className="primary" onClick={() => void draft()}>
              <Download size={17} />
              {pick(
                lang,
                "Prepare assistance-request draft",
                "உதவிக் கோரிக்கை வரைவு",
              )}
            </button>
          </div>
        </section>
      </div>
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
