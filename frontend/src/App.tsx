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
  FileCheck2,
  HandHelping,
  Menu,
  Plus,
  Trash2,
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

type Page = "home" | "assistant" | "case" | "sources" | "review";
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
  async function start() {
    setBusy(true);
    setError("");
    try {
      if (!session) {
        const result = await api<Case & { token: string }>("/cases", {
          method: "POST",
          body: JSON.stringify(profile),
        });
        const next = { id: result.id, token: result.token };
        setSession(next);
        localStorage.setItem("crop-assistant-session", JSON.stringify(next));
        setCaseData(result);
      }
      setPage("assistant");
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
            {pick(lang, "Crop Insurance", "பயிர்க் காப்பீடு")}
            <small>{pick(lang, "ASSISTANT", "உதவியாளர்")}</small>
          </span>
        </a>
        <div className="nav-caption">
          {pick(lang, "FARMER WORKSPACE", "விவசாயி பணியிடம்")}
        </div>
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
              {pick(lang, "Tamil Nadu pilot", "தமிழ்நாடு மாதிரி")}
              <small>
                {pick(
                  lang,
                  "3 Cauvery delta districts",
                  "3 காவிரி டெல்டா மாவட்டங்கள்",
                )}
              </small>
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
          <p>
            {pick(
              lang,
              "Independent guidance. Official authorities decide eligibility and claims.",
              "சுயாதீன வழிகாட்டுதல். தகுதியையும் கோரிக்கைகளையும் அரசு அதிகாரிகள் முடிவு செய்வர்.",
            )}
          </p>
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
          <div>
            <span className="live-dot" />
            {pick(lang, "Demo Day prototype", "செயல்விளக்க மாதிரி")}
          </div>
          <div className="top-actions">
            <span className="backend-status">
              {health?.llm_configured
                ? pick(
                    lang,
                    "DeepSeek configured",
                    "DeepSeek அமைக்கப்பட்டுள்ளது",
                  )
                : pick(
                    lang,
                    "Retrieval mode · AI keys needed",
                    "ஆதாரத் தேடல் முறை · AI விசைகள் தேவை",
                  )}
            </span>
            {session && (
              <button className="text-button" onClick={newCase}>
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
                      onClick={() => void start()}
                      disabled={busy}
                    >
                      {pick(
                        lang,
                        session ? "Continue my case" : "Start with a question",
                        session
                          ? "வழக்கைத் தொடரவும்"
                          : "கேள்வியுடன் தொடங்கவும்",
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
                  <div className="hero-assurance">
                    <ShieldCheck size={17} />
                    {pick(
                      lang,
                      "No eligibility promises. No hidden sources.",
                      "தகுதிக்கு வாக்குறுதி இல்லை. ஆதாரங்கள் வெளிப்படையானவை.",
                    )}
                  </div>
                </div>
                <div className="journey-preview">
                  <div className="preview-header">
                    <Sprout size={21} />
                    <span>
                      {pick(
                        lang,
                        "YOUR INSURANCE JOURNEY",
                        "உங்கள் காப்பீட்டுப் பயணம்",
                      )}
                    </span>
                    <span className="pill">
                      {pick(lang, "5 stages", "5 படிகள்")}
                    </span>
                  </div>
                  <div className="journey-list">
                    {stages.map((s, i) => (
                      <div key={s} className={i === 0 ? "current" : ""}>
                        <span className="step-number">{i + 1}</span>
                        <div>
                          <strong>
                            {stageNames[s][lang === "ta" ? 1 : 0]}
                          </strong>
                          <small>
                            {pick(
                              lang,
                              [
                                "Know the applicable rules",
                                "Keep required information ready",
                                "Understand the reporting route",
                                "Keep a record of each interaction",
                                "Find the right escalation route",
                              ][i],
                              [
                                "பொருந்தும் விதிகளை அறியவும்",
                                "தேவையான தகவல்களைத் தயாரிக்கவும்",
                                "பதிவு செய்யும் வழியை அறியவும்",
                                "ஒவ்வொரு தொடர்பையும் பதிவு செய்யவும்",
                                "மேல்முறையீட்டு வழியைக் கண்டறியவும்",
                              ][i],
                            )}
                          </small>
                        </div>
                        {i === 0 && <ArrowRight size={18} />}
                      </div>
                    ))}
                  </div>
                  <div className="preview-footer">
                    <BookOpen size={16} />
                    {pick(
                      lang,
                      "Source-backed guidance at each step",
                      "ஒவ்வொரு படியிலும் ஆதார வழிகாட்டுதல்",
                    )}
                  </div>
                </div>
              </section>
              <section className="scope-panel">
                <div>
                  <div className="eyebrow">
                    {pick(
                      lang,
                      "YOUR STARTING POINT",
                      "உங்கள் தொடக்கப் புள்ளி",
                    )}
                  </div>
                  <h2>
                    {pick(
                      lang,
                      "Guidance for your district",
                      "உங்கள் மாவட்டத்திற்கான வழிகாட்டுதல்",
                    )}
                  </h2>
                  <p>
                    {pick(
                      lang,
                      "Paddy crop-insurance assistance for this focused prototype.",
                      "இந்த மாதிரியில் நெல் பயிர்க் காப்பீட்டு உதவி.",
                    )}
                  </p>
                </div>
                <div className="scope-fields">
                  <label>
                    {pick(lang, "District", "மாவட்டம்")}
                    <select
                      disabled={!!session}
                      value={profile.district}
                      onChange={(e) =>
                        setProfile({ ...profile, district: e.target.value })
                      }
                    >
                      {districts.map((d) => (
                        <option key={d} value={d}>
                          {lang === "ta" ? districtTamil[d] : d}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {pick(lang, "Season", "பருவம்")}
                    <select
                      disabled={!!session}
                      value={profile.season}
                      onChange={(e) =>
                        setProfile({ ...profile, season: e.target.value })
                      }
                    >
                      {[
                        "Not specified",
                        "Kuruvai 2026",
                        "Samba / Thaladi 2026–27",
                      ].map((s) => (
                        <option key={s} value={s}>
                          {pick(
                            lang,
                            s,
                            (
                              {
                                "Not specified": "குறிப்பிடப்படவில்லை",
                                "Kuruvai 2026": "குறுவை 2026",
                                "Samba / Thaladi 2026–27":
                                  "சம்பா / தாளடி 2026–27",
                              } as Record<string, string>
                            )[s],
                          )}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>
              <div className="feature-grid">
                {[
                  [
                    MessagesSquare,
                    "Talk in your language",
                    "உங்கள் மொழியில் பேசுங்கள்",
                    "English and Tamil, with Sarvam translation and optional voice input.",
                    "Sarvam மொழிபெயர்ப்புடன் ஆங்கிலம், தமிழ் மற்றும் குரல் உள்ளீடு.",
                  ],
                  [
                    FileCheck2,
                    "Keep the case together",
                    "வழக்கு விவரங்களை ஒன்றாக வைத்திருங்கள்",
                    "A preparation checklist, a case diary and an assistance-request draft.",
                    "தயாரிப்புப் பட்டியல், வழக்குக் குறிப்பேடு மற்றும் உதவிக் கோரிக்கை வரைவு.",
                  ],
                  [
                    HandHelping,
                    "A person when it matters",
                    "தேவையானபோது மனித உதவி",
                    "Uncertain answers go to a reviewer, with the evidence attached.",
                    "தெளிவற்ற பதில்கள் ஆதாரங்களுடன் மதிப்பாய்வாளருக்குச் செல்லும்.",
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
              <div className="notice">
                <ShieldCheck size={20} />
                <p>
                  {pick(
                    lang,
                    "This is a working academic prototype. It does not submit claims or connect to live insurer systems. Current village-level premiums, deadlines and coverage require an applicable official notification.",
                    "இது கல்விசார் செயல்விளக்க மாதிரி. கோரிக்கைகளைச் சமர்ப்பிக்கவோ காப்பீட்டு நிறுவனத்துடன் நேரடியாக இணைக்கவோ முடியாது. தற்போதைய பிரீமியம், கடைசி தேதி மற்றும் காப்பீட்டு விவரங்களுக்கு பொருந்தும் அரசு அறிவிப்பு தேவை.",
                  )}
                </p>
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
                  "Choose your district and season on the overview. No identity or bank information is needed.",
                  "முகப்பில் மாவட்டத்தையும் பருவத்தையும் தேர்ந்தெடுக்கவும். அடையாள அல்லது வங்கித் தகவல்கள் தேவையில்லை.",
                )}
              </p>
              <button className="primary" onClick={() => setPage("home")}>
                {pick(lang, "Back to overview", "முகப்புக்குச் செல்லவும்")}
              </button>
            </section>
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
        <footer className="app-footer">
          <span>
            {pick(
              lang,
              "Built for farmer understanding. Supported by evidence.",
              "விவசாயிகளின் புரிதலுக்காக. ஆதாரங்களுடன்.",
            )}
          </span>
          <span>
            {pick(
              lang,
              "Thanjavur · Tiruvarur · Nagapattinam",
              "தஞ்சாவூர் · திருவாரூர் · நாகப்பட்டினம்",
            )}
          </span>
        </footer>
      </main>
    </div>
  );
}
function ArrowUpRightIcon() {
  return <ArrowRight size={16} style={{ transform: "rotate(-35deg)" }} />;
}
function SavedCases({
  onRestore,
  lang,
}: {
  onRestore: (s: Session) => void;
  lang: Lang;
}) {
  let saved: Session[] = [];
  try {
    saved = JSON.parse(localStorage.getItem("crop-assistant-saved") || "[]");
  } catch {
    /* invalid storage */
  }
  return saved.length ? (
    <details className="saved-cases">
      <summary>
        {pick(
          lang,
          "Previous cases on this device",
          "இந்தச் சாதனத்தில் முந்தைய வழக்குகள்",
        )}
      </summary>
      {saved.map((s) => (
        <button key={s.id} className="secondary" onClick={() => onRestore(s)}>
          {s.id.slice(0, 8)}
        </button>
      ))}
    </details>
  ) : null;
}
