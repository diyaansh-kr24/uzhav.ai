import { useEffect, useState } from "react";
import {
  Leaf,
  LayoutDashboard,
  MessagesSquare,
  FolderCheck,
  LibraryBig,
  ShieldCheck,
  ArrowRight,
  MapPin,
  Globe2,
  Sprout,
  BookOpen,
  ListChecks,
  HandHelping,
  Menu,
  Plus,
  Trash2,
  Moon,
  X,
  Sun,
} from "lucide-react";
import { api } from "./api";
import {
  pick,
  districts,
  districtTamil,
  initialProfile,
  stageNames,
  stages,
  type Profile,
  type Session,
  type Case,
  type Health,
  type Lang,
} from "./types";
import Chat from "./Chat";
import CasePanel from "./CasePanel";
import Sources from "./Sources";
import Review from "./Review";
import Intake from "./Intake";

type Page = "home" | "intake" | "assistant" | "case" | "sources" | "review";
function restore(): Session | null {
  try {
    return JSON.parse(localStorage.getItem("crop-assistant-session") || "null");
  } catch {
    return null;
  }
}
export default function App() {
  const [page, setPage] = useState<Page>("home"),
    [lang, setLang] = useState<Lang>("en"),
    [profile, setProfile] = useState<Profile>(initialProfile),
    [session, setSession] = useState<Session | null>(restore),
    [caseData, setCaseData] = useState<Case | null>(null),
    [health, setHealth] = useState<Health | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [theme, setTheme] = useState<"light" | "dark">(() => {
      try {
        const saved = localStorage.getItem("uzhav-theme");
        if (saved === "light" || saved === "dark") return saved;
      } catch {
        /* storage unavailable */
      }
      return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }),
    [mobile, setMobile] = useState(false);
  useEffect(() => {
    api<Health>("/health")
      .then(setHealth)
      .catch(() =>
        setError("Backend unavailable. Start the API server on port 8000."),
      );
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("uzhav-theme", theme);
    } catch {
      /* storage unavailable: theme resets next visit */
    }
  }, [theme]);
  useEffect(() => {
    if (session)
      api<Case>(`/cases/${session.id}`, {}, session)
        .then((c) => {
          setCaseData(c);
          setProfile(c.profile);
        })
        .catch(() => {
          localStorage.removeItem("crop-assistant-session");
          setSession(null);
        });
  }, [session]);
  async function refresh() {
    if (session)
      setCaseData(await api<Case>(`/cases/${session.id}`, {}, session));
  }
  function start() {
    setError("");
    setPage(session ? "assistant" : "intake");
  }
  async function finishIntake(answers: Profile) {
    setBusy(true);
    setError("");
    try {
      const created = await api<Case & { token: string }>("/cases", {
        method: "POST",
        body: JSON.stringify(answers),
      });
      const next = { id: created.id, token: created.token };
      localStorage.setItem("crop-assistant-session", JSON.stringify(next));
      setProfile(created.profile);
      setCaseData(created);
      try {
        await api(
          `/cases/${created.id}/plan`,
          { method: "POST", body: JSON.stringify({ language: lang }) },
          next,
        );
      } catch (e) {
        setError((e as Error).message);
      }
      setCaseData(await api<Case>(`/cases/${created.id}`, {}, next));
      setSession(next);
      setPage("case");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function newCase() {
    if (
      session &&
      !window.confirm(
        pick(
          lang,
          "Start another case? The current case remains saved on this device.",
          "மற்றொரு வழக்கைத் தொடங்கவா? தற்போதைய வழக்கு இந்தச் சாதனத்தில் சேமிக்கப்படும்.",
        ),
      )
    )
      return;
    if (session) {
      const saved: Session[] = JSON.parse(
        localStorage.getItem("crop-assistant-saved") || "[]",
      );
      localStorage.setItem(
        "crop-assistant-saved",
        JSON.stringify([...saved.filter((s) => s.id !== session.id), session]),
      );
    }
    setSession(null);
    setCaseData(null);
    localStorage.removeItem("crop-assistant-session");
    setPage("home");
  }
  async function remove() {
    if (
      !session ||
      !window.confirm(
        pick(
          lang,
          "Delete this prototype case and its conversation permanently?",
          "இந்த மாதிரி வழக்கையும் உரையாடலையும் நிரந்தரமாக நீக்கவா?",
        ),
      )
    )
      return;
    try {
      await api(`/cases/${session.id}`, { method: "DELETE" }, session);
      const saved: Session[] = JSON.parse(
        localStorage.getItem("crop-assistant-saved") || "[]",
      );
      localStorage.setItem(
        "crop-assistant-saved",
        JSON.stringify(saved.filter((s) => s.id !== session.id)),
      );
      setSession(null);
      setCaseData(null);
      localStorage.removeItem("crop-assistant-session");
      setPage("home");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const nav: [Page, typeof Leaf, string, string][] = [
    ["home", LayoutDashboard, "Overview", "முகப்பு"],
    ["assistant", MessagesSquare, "Ask assistant", "உதவியாளர்"],
    ["case", FolderCheck, "My case", "என் வழக்கு"],
    ["sources", LibraryBig, "Source library", "ஆதார நூலகம்"],
    ["review", ShieldCheck, "Reviewer workspace", "மதிப்பாய்வாளர் பணியிடம்"],
  ];
  return (
    <div className={"app " + (lang === "ta" ? "tamil" : "")}>
      <aside className={"sidebar " + (mobile ? "open" : "")}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setPage("home");
          }}
        >
          <span className="brand-mark">
            <Sprout size={29} />
          </span>
          <span>
            Uzhav.ai
          </span>
        </a>
        <nav>
          {nav.map(([id, Icon, en, ta]) => (
            <button
              key={id}
              className={page === id ? "active" : ""}
              onClick={() => {
                setPage(id);
                setMobile(false);
                setError("");
              }}
            >
              <Icon size={20} />
              {pick(lang, en, ta)}
              {id === "assistant" && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="region-note">
            <MapPin size={18} />
            <span>
              {pick(lang, "Tamil Nadu", "தமிழ்நாடு")}
            </span>
          </div>
          <label className="language">
            <Globe2 size={18} />
            <select
              aria-label="Interface language"
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
            >
              <option value="en">English</option>
              <option value="ta">தமிழ்</option>
            </select>
          </label>
          <button
            className="theme-toggle"
            aria-pressed={theme === "dark"}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            {theme === "dark"
              ? pick(lang, "Light mode", "வெளிர் பயன்முறை")
              : pick(lang, "Dark mode", "இருண்ட பயன்முறை")}
          </button>
          <div className="sidebar-credit">MS2002 · GROUP 20</div>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            aria-label="Toggle navigation"
            onClick={() => setMobile(!mobile)}
          >
            <Menu />
          </button>
          <div />
          <div className="top-actions">
            {session && (
              <button className="new-case-button" onClick={newCase}>
                <Plus size={15} />
                {pick(lang, "New case", "புதிய வழக்கு")}
              </button>
            )}
          </div>
        </header>
        <div className="content">
          {error && (
            <div className="error" role="alert">
              {error}
              <button className="text-button" onClick={() => setError("")}>
                ×
              </button>
            </div>
          )}
          {page === "home" && (
            <>
              <section className="hero">
                <div className="hero-copy">
                  <div className="eyebrow">
                    <span className="tiny-leaf">
                      <Leaf size={14} />
                    </span>
                    {pick(
                      lang,
                      "SUPPORT THROUGH EVERY STAGE",
                      "ஒவ்வொரு படியிலும் உதவி",
                    )}
                  </div>
                  <h1>
                    {pick(
                      lang,
                      "Your crop. Your claim.",
                      "உங்கள் பயிர். உங்கள் கோரிக்கை.",
                    )}
                    <em>
                      {pick(
                        lang,
                        "A clearer way forward.",
                        "முன்னேறத் தெளிவான வழி.",
                      )}
                    </em>
                  </h1>
                  <p>
                    {pick(
                      lang,
                      "Understand your crop insurance, prepare the right information and get help when the next step is unclear. In your language, with the source in view.",
                      "உங்கள் பயிர்க் காப்பீட்டை அறியவும், தேவையான தகவல்களைத் தயாரிக்கவும், அடுத்த படியில் உதவி பெறவும். உங்கள் மொழியில், ஆதாரங்களுடன்.",
                    )}
                  </p>
                  <div className="hero-buttons">
                    <button
                      className="primary large"
                      onClick={start}
                      disabled={busy}
                    >
                      {pick(
                        lang,
                        session ? "Continue my case" : "Get started",
                        session ? "வழக்கைத் தொடரவும்" : "தொடங்கவும்",
                      )}
                      <ArrowRight size={19} />
                    </button>
                    <button
                      className="text-button"
                      onClick={() => setPage("sources")}
                    >
                      {pick(
                        lang,
                        "Explore the sources",
                        "ஆதாரங்களைப் பார்க்கவும்",
                      )}
                      <ArrowUpRightIcon />
                    </button>
                  </div>
                </div>
                <div className="hero-leaf" aria-hidden>
                  <span className="ring r1" />
                  <span className="ring r2" />
                  <span className="leaf-core">
                    <Sprout size={64} strokeWidth={1.6} />
                  </span>
                </div>
              </section>
              <div className="feature-grid">
                {[
                  [
                    MessagesSquare,
                    "Talk in your language",
                    "உங்கள் மொழியில் பேசுங்கள்",
                    "Ask in Tamil or English. Type it, or just say it out loud.",
                    "தமிழிலோ ஆங்கிலத்திலோ கேளுங்கள். தட்டச்சு செய்யுங்கள், அல்லது பேசினாலே போதும்.",
                  ],
                  [
                    ListChecks,
                    "Know your next step",
                    "அடுத்த படியை அறியுங்கள்",
                    "Answer a few quick questions and get a simple checklist you can tick off as you go.",
                    "சில எளிய கேள்விகளுக்குப் பதிலளித்து, படிப்படியாகக் குறியிடக்கூடிய எளிய பட்டியலைப் பெறுங்கள்.",
                  ],
                  [
                    HandHelping,
                    "A person when it matters",
                    "தேவையானபோது மனித உதவி",
                    "If we can't answer something for sure, a real person looks at it and gets back to you.",
                    "உறுதியான பதில் இல்லையெனில், ஒருவர் அதைப் பார்த்து உங்களுக்குப் பதில் தருவார்.",
                  ],
                ].map(([I, en, ta, desc, td], i) => {
                  const Icon = I as typeof Leaf;
                  return (
                    <section className="feature" key={i}>
                      <Icon size={23} />
                      <h3>{pick(lang, en as string, ta as string)}</h3>
                      <p>{pick(lang, desc as string, td as string)}</p>
                    </section>
                  );
                })}
              </div>
            </>
          )}
          {(page === "assistant" || page === "case") && !caseData && (
            <section className="panel start-panel">
              <Sprout size={40} />
              <h1>
                {pick(
                  lang,
                  "First, set up your case.",
                  "முதலில் உங்கள் வழக்கை அமைக்கவும்.",
                )}
              </h1>
              <p>
                {pick(
                  lang,
                  "Answer a few quick questions so the advice fits your situation. No identity or bank information is needed.",
                  "உங்கள் நிலைக்கு ஏற்ற வழிகாட்டுதலுக்கு சில எளிய கேள்விகளுக்குப் பதிலளிக்கவும். அடையாள அல்லது வங்கித் தகவல்கள் தேவையில்லை.",
                )}
              </p>
              <button className="primary" onClick={() => setPage("intake")}>
                {pick(lang, "Answer the questions", "கேள்விகளுக்குப் பதிலளிக்கவும்")}
              </button>
            </section>
          )}
          {page === "intake" && (
            <Intake
              lang={lang}
              busy={busy}
              onDone={(p) => void finishIntake(p)}
              onCancel={() => setPage("home")}
            />
          )}
          {page === "assistant" && caseData && session && (
            <Chat
              key={session.id}
              caseData={caseData}
              session={session}
              lang={lang}
              health={health}
              refresh={refresh}
            />
          )}
          {page === "case" && caseData && session && (
            <>
              <CasePanel
                data={caseData}
                session={session}
                lang={lang}
                refresh={refresh}
                fail={setError}
                onAsk={() => setPage("assistant")}
              />
              <button
                className="text-button danger"
                onClick={() => void remove()}
              >
                <Trash2 size={15} />
                {pick(
                  lang,
                  "Delete this prototype case",
                  "இந்த மாதிரி வழக்கை நீக்கவும்",
                )}
              </button>
            </>
          )}
          {page === "sources" && <Sources lang={lang} />}
          {page === "review" && <Review lang={lang} />}
          {page === "home" && (
            <SavedCases
              onRestore={(s) => {
                setSession(s);
                localStorage.setItem(
                  "crop-assistant-session",
                  JSON.stringify(s),
                );
                setPage("case");
              }}
              lang={lang}
            />
          )}
        </div>
      </main>
    </div>
  );
}
function ArrowUpRightIcon() {
  return <ArrowRight size={16} style={{ transform: "rotate(-35deg)" }} />;
}
function readSaved(): Session[] {
  try {
    const v = JSON.parse(localStorage.getItem("crop-assistant-saved") || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function writeSaved(list: Session[]) {
  try {
    localStorage.setItem("crop-assistant-saved", JSON.stringify(list));
  } catch {
    /* storage unavailable */
  }
}
function forgetLocal(id: string) {
  try {
    localStorage.removeItem("uzhav-checklist:" + id);
  } catch {
    /* storage unavailable */
  }
}
function SavedCases({
  onRestore,
  lang,
}: {
  onRestore: (s: Session) => void;
  lang: Lang;
}) {
  const [saved, setSaved] = useState<Session[]>(readSaved);
  async function deleteOne(s: Session) {
    // Delete on the server too; a case that no longer exists there just leaves the list.
    try {
      await api(`/cases/${s.id}`, { method: "DELETE" }, s);
    } catch {
      /* already gone or access expired */
    }
    forgetLocal(s.id);
    const next = readSaved().filter((x) => x.id !== s.id);
    writeSaved(next);
    setSaved(next);
  }
  async function remove(s: Session) {
    if (
      !window.confirm(
        pick(lang, "Delete this case and its chat permanently?", "இந்த வழக்கையும் உரையாடலையும் நிரந்தரமாக நீக்கவா?"),
      )
    )
      return;
    await deleteOne(s);
  }
  async function clearAll() {
    if (
      !window.confirm(
        pick(
          lang,
          `Delete all ${saved.length} previous cases and their chats permanently?`,
          `முந்தைய ${saved.length} வழக்குகளையும் உரையாடல்களையும் நிரந்தரமாக நீக்கவா?`,
        ),
      )
    )
      return;
    for (const s of saved) await deleteOne(s);
  }
  return saved.length ? (
    <details className="saved-cases">
      <summary>
        {pick(lang, "Previous cases on this device", "இந்தச் சாதனத்தில் முந்தைய வழக்குகள்")} ({saved.length})
      </summary>
      <div className="saved-list">
        {saved.map((s) => (
          <span key={s.id} className="saved-item">
            <button className="secondary" onClick={() => onRestore(s)}>
              {s.id.slice(0, 8)}
            </button>
            <button
              className="saved-remove"
              aria-label={pick(lang, "Delete case", "வழக்கை நீக்கு")}
              title={pick(lang, "Delete case", "வழக்கை நீக்கு")}
              onClick={() => void remove(s)}
            >
              <X size={14} />
            </button>
          </span>
        ))}
      </div>
      <button className="text-button danger saved-clear" onClick={() => void clearAll()}>
        <Trash2 size={14} />
        {pick(lang, "Clear all", "அனைத்தையும் நீக்கு")}
      </button>
    </details>
  ) : null;
}
