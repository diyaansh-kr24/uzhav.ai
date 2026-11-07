import { useState, useRef, useEffect } from "react";
import { Send, Mic, Square, LoaderCircle, Leaf } from "lucide-react";
import type { Case, Session, Lang, Health, Result } from "./types";
import { pick, districtTamil } from "./types";
import { api } from "./api";
import AnswerBody from "./Answer";

const SITUATION: Record<string, [string, string]> = {
  enrol: ["and that you want to get your crop insured", "உங்கள் பயிரைக் காப்பீடு செய்ய விரும்புகிறீர்கள்"],
  damaged: ["and that your crop has been damaged", "உங்கள் பயிர் பாதிக்கப்பட்டுள்ளது"],
  waiting: ["and that you are waiting on a reported loss", "பதிவு செய்த இழப்புக்காகக் காத்திருக்கிறீர்கள்"],
  problem: ["and that you have a problem with your claim", "உங்கள் கோரிக்கையில் சிக்கல் உள்ளது"],
};

const HINT: Record<string, [string, string]> = {
  enrol: ["e.g. Which documents do I need to enrol?", "எ.கா. பதிவு செய்ய என்ன ஆவணங்கள் தேவை?"],
  damaged: ["e.g. Where do I report the crop damage?", "எ.கா. பயிர் பாதிப்பை எங்கே பதிவு செய்வது?"],
  waiting: ["e.g. How can I check on my claim?", "எ.கா. என் கோரிக்கையின் நிலையை எப்படி அறிவது?"],
  problem: ["e.g. My claim was rejected. What can I do?", "எ.கா. என் கோரிக்கை நிராகரிக்கப்பட்டது. என்ன செய்யலாம்?"],
  default: ["e.g. How do I report crop loss?", "எ.கா. பயிர் இழப்பை எப்படிப் பதிவு செய்வது?"],
};

function hintFor(caseData: Case, lang: Lang): string {
  const base = HINT[caseData.profile.situation || "default"] || HINT.default;
  const last: Result | undefined = caseData.messages.at(-1)?.result;
  if (lang === "en" && last?.suggested_reply) return "e.g. " + last.suggested_reply;
  if (last && last.status !== "answered")
    return pick(lang, "Try asking it differently, ", "வேறு விதமாகக் கேட்டுப் பாருங்கள், ") + pick(lang, base[0], base[1]);
  return pick(lang, base[0], base[1]);
}

export default function Chat({
  caseData,
  session,
  lang,
  health,
  refresh,
  onShowPlan,
}: {
  caseData: Case;
  session: Session;
  lang: Lang;
  health: Health | null;
  refresh: () => Promise<void>;
  onShowPlan?: () => void;
}) {
  const [question, setQuestion] = useState(""),
    [pending, setPending] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [recording, setRecording] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottom = useRef<HTMLDivElement | null>(null);
  // Replies shown in the other language: key `${messageId}:${lang}` -> text.
  const [translated, setTranslated] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    const todo = caseData.messages.filter(
      (m) => m.result.language !== lang && !translated[`${m.id}:${lang}`],
    );
    (async () => {
      for (const m of todo) {
        try {
          const out = await api<{ answer: string }>(
            `/cases/${session.id}/messages/${m.id}/translate`,
            { method: "POST", body: JSON.stringify({ language: lang }) },
            session,
          );
          if (cancelled) return;
          setTranslated((t) => ({ ...t, [`${m.id}:${lang}`]: out.answer }));
        } catch {
          /* leave this reply in its original language */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, caseData.messages.length, session.id]);
  const shown = (m: Case["messages"][number]): Result => {
    const t = translated[`${m.id}:${lang}`];
    return t && m.result.language !== lang ? { ...m.result, answer: t } : m.result;
  };
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      stream.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [caseData.messages.length, busy]);

  async function send() {
    const q = question.trim();
    if (busy || q.length < 3) return;
    setBusy(true);
    setError("");
    setPending(q);
    setQuestion("");
    try {
      await api<Result>(
        `/cases/${session.id}/chat`,
        { method: "POST", body: JSON.stringify({ question: q, language: lang }) },
        session,
      );
      await refresh();
    } catch (e) {
      setQuestion(q);
      setError((e as Error).message);
    } finally {
      setPending("");
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
      if (!health?.sarvam_configured)
        throw new Error(pick(lang, "Voice input is not set up on the server.", "குரல் உள்ளீடு அமைக்கப்படவில்லை."));
      const input = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = input;
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
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

  const p = caseData.profile;
  const where = lang === "ta" ? districtTamil[p.district] || p.district : p.district;
  const situation = p.situation ? SITUATION[p.situation] : null;
  const greeting = pick(
    lang,
    `Vanakkam! I'm Uzhav.ai. I can see your paddy is in ${where}${situation ? " " + situation[0] : ""}. What would you like help with?`,
    `வணக்கம்! நான் உழவ்.ai. உங்கள் நெல் வயல் ${where}-இல் உள்ளது${situation ? ", " + situation[1] : ""}. எதில் உதவ வேண்டும்?`,
  );

  return (
    <div className="chat-simple">
      <div className="chat-thread" aria-live="polite">
        <div className="bubble bot">
          <span className="bot-mark"><Leaf size={16} /></span>
          <div className="bubble-body"><p className="answer-copy">{greeting}</p></div>
        </div>
        {caseData.messages.map((m) => (
          <div key={m.id} className="turn">
            <div className="bubble user"><p>{m.question}</p></div>
            <div className="bubble bot">
              <span className="bot-mark"><Leaf size={16} /></span>
              <div className="bubble-body">
                {m.result.status === "needs_review" && (
                  <span className="status needs_review">
                    {pick(lang, "Sent to a person for review", "மனித மதிப்பாய்வுக்கு அனுப்பப்பட்டது")}
                  </span>
                )}
                <AnswerBody result={shown(m)} lang={lang} />
              </div>
            </div>
          </div>
        ))}
        {pending && (
          <div className="bubble user"><p>{pending}</p></div>
        )}
        {busy && (
          <div className="bubble bot thinking" role="status">
            <span className="bot-mark"><Leaf size={16} /></span>
            <div className="bubble-body">
              <LoaderCircle className="spin" size={18} />
              {pick(lang, "Thinking…", "யோசிக்கிறது…")}
            </div>
          </div>
        )}
        <div ref={bottom} />
      </div>

      {error && <div role="alert" className="error">{error}</div>}

      <form
        className="composer chat-composer"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <textarea
          aria-label={pick(lang, "Your message", "உங்கள் செய்தி")}
          value={question}
          maxLength={1600}
          rows={2}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder={hintFor(caseData, lang)}
        />
        <div className="composer-bottom">
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
            aria-label={pick(lang, "Send", "அனுப்பு")}
            disabled={busy || recording || question.trim().length < 3}
          >
            <Send size={17} />
          </button>
        </div>
      </form>
    </div>
  );
}
