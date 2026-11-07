import { useState, useRef, useEffect } from "react";
import {
  Send,
  Mic,
  Square,
  ShieldCheck,
  ArrowUpRight,
  LoaderCircle,
  UserRound,
  Leaf,
  CheckCircle2,
} from "lucide-react";
import type { Case, Session, Lang, Health, Result } from "./types";
import { pick, stageNames } from "./types";
import { api } from "./api";
import Evidence, { Citations } from "./Evidence";

export default function Chat({
  caseData,
  session,
  lang,
  health,
  refresh,
}: {
  caseData: Case;
  session: Session;
  lang: Lang;
  health: Health | null;
  refresh: () => Promise<void>;
}) {
  const [question, setQuestion] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [consent, setConsent] = useState(false),
    [recording, setRecording] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      stream.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );
  const examples =
    lang === "en"
      ? [
          "How can I raise a crop-insurance grievance?",
          "What is the difference between area-yield and localised losses?",
          "What is the premium for my village this season?",
        ]
      : [
          "பயிர்க் காப்பீட்டுக் குறையை எப்படி பதிவு செய்வது?",
          "பகுதி மகசூல் இழப்புக்கும் உள்ளூர் பாதிப்புக்கும் என்ன வேறுபாடு?",
          "இந்தப் பருவத்தில் என் கிராமத்திற்கான பிரீமியம் என்ன?",
        ];
  async function send() {
    if (busy || !question.trim()) return;
    setBusy(true);
    setError("");
    try {
      await api<Result>(
        `/cases/${session.id}/chat`,
        {
          method: "POST",
          body: JSON.stringify({ question, language: lang, consent }),
        },
        session,
      );
      setQuestion("");
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function voice() {
    if (recording) {
      recorder.current?.stop();
      return;
    }
    setError("");
    try {
      if (!consent)
        throw new Error(
          pick(
            lang,
            "Enable provider consent before recording.",
            "பதிவு செய்வதற்கு முன் சேவை ஒப்புதலைத் தேர்ந்தெடுக்கவும்.",
          ),
        );
      if (!health?.sarvam_configured)
        throw new Error(
          pick(
            lang,
            "Configure Sarvam in the server .env first.",
            "முதலில் சேவையகத்தில் Sarvam-ஐ அமைக்கவும்.",
          ),
        );
      const input = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = input;
      const mime = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
      const r = new MediaRecorder(input, { mimeType: mime });
      recorder.current = r;
      const parts: BlobPart[] = [];
      r.ondataavailable = (e) => parts.push(e.data);
      r.onstop = async () => {
        if (timer.current) clearTimeout(timer.current);
        input.getTracks().forEach((t) => t.stop());
        setRecording(false);
        setBusy(true);
        try {
          const form = new FormData();
          form.append("file", new Blob(parts, { type: mime }), "question.webm");
          form.append("consent", "true");
          const out = await api<{ text: string }>(
            `/cases/${session.id}/speech`,
            { method: "POST", body: form },
            session,
          );
          setQuestion(out.text);
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      };
      r.start();
      setRecording(true);
      timer.current = setTimeout(() => {
        if (r.state === "recording") r.stop();
      }, 25000);
    } catch (e) {
      stream.current?.getTracks().forEach((t) => t.stop());
      setError((e as Error).message);
    }
  }
  return (
    <div className="chat-layout">
      <div className="chat-main">
        <div className="page-heading">
          <div className="eyebrow">
            {pick(lang, "YOUR PERSONAL GUIDE", "உங்கள் வழிகாட்டி")}
          </div>
          <h1>
            {pick(
              lang,
              "One question. A clearer next step.",
              "ஒரு கேள்வி. தெளிவான அடுத்த படி.",
            )}
          </h1>
          <p>
            {pick(
              lang,
              "Ask in English or Tamil. Every generated explanation comes with the passages behind it.",
              "ஆங்கிலம் அல்லது தமிழில் கேளுங்கள். உருவாக்கப்பட்ட விளக்கத்திற்கான ஆதாரங்களும் வழங்கப்படும்.",
            )}
          </p>
        </div>
        <div className="context-strip">
          <span>
            <Leaf size={15} />
            {caseData.profile.district}
          </span>
          <span>{pick(lang, "Paddy", "நெல்")}</span>
          <span>
            {stageNames[caseData.profile.stage][lang === "ta" ? 1 : 0]}
          </span>
        </div>
        {!caseData.messages.length && (
          <div className="welcome">
            <div className="assistant-mark">
              <Leaf />
            </div>
            <h2>
              {pick(
                lang,
                "Where would you like to start?",
                "எங்கிருந்து தொடங்க விரும்புகிறீர்கள்?",
              )}
            </h2>
            <p>
              {pick(
                lang,
                "Describe the step you are stuck on. Keep identity and bank numbers out of the conversation.",
                "நீங்கள் சிரமப்படும் படியை விவரிக்கவும். அடையாள மற்றும் வங்கிக் கணக்கு எண்களைப் பகிர வேண்டாம்.",
              )}
            </p>
            <div className="suggestions">
              {examples.map((q) => (
                <button key={q} onClick={() => setQuestion(q)}>
                  {q}
                  <ArrowUpRight size={17} />
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="messages" aria-live="polite">
          {caseData.messages.map((m) => (
            <article key={m.id} className="exchange">
              <div className="question">
                <UserRound size={18} />
                <p>{m.question}</p>
              </div>
              <div className="answer">
                <div className="answer-heading">
                  <Leaf size={20} />
                  <strong>
                    {pick(
                      lang,
                      "Crop Insurance Assistant",
                      "பயிர்க் காப்பீட்டு உதவியாளர்",
                    )}
                  </strong>
                  <span className={"status " + m.result.status}>
                    {m.result.status === "answered"
                      ? pick(
                          lang,
                          "Sources checked",
                          "ஆதாரங்கள் சரிபார்க்கப்பட்டன",
                        )
                      : m.result.status === "needs_review"
                        ? pick(
                            lang,
                            "Human review requested",
                            "மனித மதிப்பாய்வு கோரப்பட்டது",
                          )
                        : pick(
                            lang,
                            "No AI answer issued",
                            "AI பதில் வழங்கப்படவில்லை",
                          )}
                  </span>
                </div>
                {m.result.claims.length ? (
                  m.result.claims.map((c, i) => (
                    <p className="answer-copy" key={i}>
                      {c.text}{" "}
                      <Citations
                        ids={c.citation_ids}
                        items={m.result.evidence}
                      />
                    </p>
                  ))
                ) : (
                  <p className="answer-copy">{m.result.answer}</p>
                )}
                {m.result.redacted && (
                  <small>
                    {pick(
                      lang,
                      "Possible personal identifiers were removed.",
                      "தனிப்பட்ட அடையாள விவரங்கள் நீக்கப்பட்டன.",
                    )}
                  </small>
                )}
                {!!m.result.actions.length && (
                  <div className="next-actions">
                    <strong>
                      {pick(
                        lang,
                        "Suggested next steps",
                        "பரிந்துரைக்கப்பட்ட அடுத்த படிகள்",
                      )}
                    </strong>
                    {m.result.actions.map((a, i) => (
                      <p key={i}>
                        <CheckCircle2 size={17} />
                        <span>
                          {a.text}{" "}
                          <Citations
                            ids={a.citation_ids}
                            items={m.result.evidence}
                          />
                        </span>
                      </p>
                    ))}
                  </div>
                )}
                {!!m.result.missing_information.length && (
                  <p>{m.result.missing_information.join(" · ")}</p>
                )}
                {m.result.claims.some((c) => c.original_text) && (
                  <details>
                    <summary>
                      {pick(
                        lang,
                        "Original English answer",
                        "மூல ஆங்கிலப் பதில்",
                      )}
                    </summary>
                    {m.result.claims.map((c, i) => (
                      <p key={i}>{c.original_text}</p>
                    ))}
                  </details>
                )}
                {!!m.result.evidence.length && (
                  <Evidence items={m.result.evidence} lang={lang} />
                )}
                <details className="trace">
                  <summary>
                    {pick(
                      lang,
                      "How this response was produced",
                      "இந்தப் பதில் உருவான விதம்",
                    )}
                  </summary>
                  <ol>
                    {m.result.trace.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ol>
                  <small>
                    {m.result.engine} · {m.result.elapsed_ms} ms
                  </small>
                  <p>
                    {pick(
                      lang,
                      "Retrieval scores and model checks are safeguards, not a guarantee of correctness.",
                      "தேடல் மதிப்பெண்களும் மாதிரிச் சரிபார்ப்புகளும் சரியான பதிலுக்கான உத்தரவாதம் அல்ல.",
                    )}
                  </p>
                </details>
              </div>
            </article>
          ))}
        </div>
        {busy && (
          <div className="working" role="status">
            <LoaderCircle className="spin" size={20} />
            {pick(
              lang,
              "Checking documents and preparing your response…",
              "ஆவணங்கள் சரிபார்க்கப்படுகின்றன…",
            )}
          </div>
        )}
        {error && (
          <div role="alert" className="error">
            {error}
          </div>
        )}
        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <textarea
            aria-label={pick(lang, "Your question", "உங்கள் கேள்வி")}
            value={question}
            maxLength={1600}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={pick(
              lang,
              "Ask about your crop-insurance journey…",
              "பயிர்க் காப்பீடு பற்றிய உங்கள் கேள்வி…",
            )}
          />
          <div className="composer-bottom">
            <span>{question.length}/1600</span>
            <button
              type="button"
              className={"icon-button " + (recording ? "recording" : "")}
              aria-label={recording ? "Stop recording" : "Record a question"}
              onClick={() => void voice()}
              disabled={busy}
            >
              {recording ? <Square size={18} /> : <Mic size={19} />}
            </button>
            <button
              className="primary"
              disabled={
                busy || recording || !consent || question.trim().length < 3
              }
            >
              <Send size={17} />
              {pick(lang, "Ask assistant", "கேள்வி கேட்கவும்")}
            </button>
          </div>
        </form>
        <label className="consent">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          {pick(
            lang,
            "I agree to send my question and case context to AI Credits and, for Tamil or voice, Sarvam. Use sample information for this prototype.",
            "என் கேள்வி மற்றும் வழக்கு விவரங்களை AI Credits-க்கும், தமிழ் அல்லது குரலுக்கு Sarvam-க்கும் அனுப்ப ஒப்புக்கொள்கிறேன். இந்த மாதிரியில் மாதிரி விவரங்களை மட்டும் பயன்படுத்தவும்.",
          )}
        </label>
      </div>
      <aside className="chat-aside">
        <ShieldCheck size={25} />
        <h3>
          {pick(
            lang,
            "Guidance you can inspect",
            "நீங்களே சரிபார்க்கும் வழிகாட்டுதல்",
          )}
        </h3>
        <p>
          {pick(
            lang,
            "Official documents stay visible alongside the answer. Questions without sufficient evidence go to human review.",
            "பதிலுடன் அரசு ஆவணங்களும் காண்பிக்கப்படும். போதுமான ஆதாரமில்லாத கேள்விகள் மனித மதிப்பாய்வுக்குச் செல்லும்.",
          )}
        </p>
        <hr />
        <small>{pick(lang, "IMPORTANT", "முக்கியம்")}</small>
        <p>
          {pick(
            lang,
            "The assistant does not decide eligibility, submit claims or retrieve live insurer status.",
            "உதவியாளர் தகுதியை முடிவு செய்யாது, கோரிக்கைகளைச் சமர்ப்பிக்காது, காப்பீட்டு நிறுவனத்தின் நேரடி நிலையைப் பெறாது.",
          )}
        </p>
        <span className="pill">
          {pick(lang, "Demo Day prototype", "செயல்விளக்க மாதிரி")}
        </span>
      </aside>
    </div>
  );
}
