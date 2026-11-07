import { useState } from "react";
import { LockKeyhole, CheckCircle2, Search } from "lucide-react";
import { api } from "./api";
import Evidence from "./Evidence";
import { pick, type Lang, type Evidence as Item, type Profile } from "./types";
type ReviewItem = {
  id: string;
  question: string;
  reason: string;
  state: string;
  response: string;
  citations: Item[] | string[];
  profile: Profile;
};
export default function Review({ lang }: { lang: Lang }) {
  const [token, setToken] = useState(""),
    [items, setItems] = useState<ReviewItem[]>([]),
    [error, setError] = useState(""),
    [selected, setSelected] = useState<ReviewItem | null>(null),
    [answer, setAnswer] = useState(""),
    [evidence, setEvidence] = useState<Item[]>([]),
    [ids, setIds] = useState<string[]>([]),
    [search, setSearch] = useState(""),
    [loaded, setLoaded] = useState(false),
    [busy, setBusy] = useState(false);
  const headers = { Authorization: "Bearer " + token };
  async function load() {
    setBusy(true);
    setError("");
    try {
      setItems(await api<ReviewItem[]>("/reviews", { headers }));
      setLoaded(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function open(r: ReviewItem) {
    setSelected(r);
    setAnswer("");
    setIds([]);
    setSearch(r.question);
    setEvidence(r.state === "pending" ? (r.citations as Item[]) : []);
  }
  async function find() {
    if (!selected) return;
    setBusy(true);
    try {
      setEvidence(
        await api<Item[]>(
          `/reviewer/evidence?q=${encodeURIComponent(search)}&district=${selected.profile.district}`,
          { headers },
        ),
      );
      setIds([]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function publish() {
    if (!selected) return;
    setBusy(true);
    try {
      await api(`/reviews/${selected.id}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ response: answer, citation_ids: ids }),
      });
      setSelected(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div className="eyebrow">
          {pick(lang, "HUMAN IN THE LOOP", "மனித மதிப்பாய்வு")}
        </div>
        <h1>
          {pick(
            lang,
            "Uncertainty gets a second look.",
            "சந்தேகத்திற்கு மீண்டும் மதிப்பாய்வு.",
          )}
        </h1>
        <p>
          {pick(
            lang,
            "Reviewers see the question, case context and retrieved sources before issuing a correction. Their response stays distinct from the AI answer.",
            "பதிலைத் திருத்துவதற்கு முன் மதிப்பாய்வாளர் கேள்வி, வழக்கு விவரங்கள் மற்றும் ஆதாரங்களைப் பார்ப்பார். மனிதரின் பதில் AI பதிலிலிருந்து தனியே காட்டப்படும்.",
          )}
        </p>
      </div>
      {!loaded ? (
        <form
          className="panel reviewer-login"
          onSubmit={(e) => {
            e.preventDefault();
            void load();
          }}
        >
          <LockKeyhole className="panel-icon" />
          <h2>{pick(lang, "Reviewer access", "மதிப்பாய்வாளர் அணுகல்")}</h2>
          <p>
            {pick(
              lang,
              "Enter the reviewer token configured on the server. It stays in memory, not browser storage.",
              "சேவையகத்தில் அமைக்கப்பட்ட மதிப்பாய்வாளர் டோக்கனை உள்ளிடவும். இது உலாவி சேமிப்பகத்தில் சேமிக்கப்படாது.",
            )}
          </p>
          <label>
            {pick(lang, "Reviewer token", "மதிப்பாய்வாளர் டோக்கன்")}
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoComplete="off"
            />
          </label>
          <button className="primary" disabled={busy || !token}>
            {pick(lang, "Open queue", "வரிசையைத் திறக்கவும்")}
          </button>
        </form>
      ) : (
        <>
          <div className="toolbar">
            <strong>
              {items.filter((x) => x.state === "pending").length}{" "}
              {pick(lang, "pending cases", "நிலுவை வழக்குகள்")}
            </strong>
            <button className="secondary" onClick={() => void load()}>
              {pick(lang, "Refresh", "புதுப்பிக்கவும்")}
            </button>
            <button
              className="text-button"
              onClick={() => {
                setLoaded(false);
                setToken("");
                setItems([]);
                setSelected(null);
              }}
            >
              {pick(lang, "Sign out", "வெளியேறு")}
            </button>
          </div>
          <div className="review-layout">
            <section>
              {items.map((r) => (
                <button
                  key={r.id}
                  className={
                    "queue-item " + (selected?.id === r.id ? "active" : "")
                  }
                  onClick={() => open(r)}
                >
                  <span className="pill">
                    {r.profile.district} · {r.state}
                  </span>
                  <strong>{r.question}</strong>
                  <small>{r.reason.replaceAll("_", " ")}</small>
                </button>
              ))}
              {!items.length && (
                <div className="panel">
                  {pick(
                    lang,
                    "No review requests yet. Ask an unsupported question to demonstrate escalation.",
                    "மதிப்பாய்வுக் கோரிக்கைகள் இல்லை. ஆதாரமற்ற கேள்வியைக் கேட்டு மேலாய்வை விளக்கலாம்.",
                  )}
                </div>
              )}
            </section>
            {selected && (
              <section className="panel">
                <h2>{selected.question}</h2>
                <p>
                  {selected.profile.district} · {selected.profile.season}
                </p>
                {selected.state === "reviewed" ? (
                  <p>{selected.response}</p>
                ) : (
                  <>
                    <div className="search-row">
                      <input
                        aria-label="Search evidence"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                      <button
                        className="secondary"
                        onClick={() => void find()}
                        disabled={busy}
                      >
                        <Search size={17} />
                      </button>
                    </div>
                    <Evidence items={evidence} lang={lang} />
                    <fieldset>
                      <legend>
                        {pick(
                          lang,
                          "Select supporting passages",
                          "ஆதாரப் பத்திகளைத் தேர்ந்தெடுக்கவும்",
                        )}
                      </legend>
                      {evidence.map((e) => (
                        <label className="check-row" key={e.id}>
                          <input
                            type="checkbox"
                            checked={ids.includes(e.id)}
                            onChange={(ev) =>
                              setIds(
                                ev.target.checked
                                  ? [...ids, e.id]
                                  : ids.filter((x) => x !== e.id),
                              )
                            }
                          />
                          {e.title} {e.page ? `p.${e.page}` : ""}
                        </label>
                      ))}
                    </fieldset>
                    <label>
                      {pick(
                        lang,
                        "Reviewed response",
                        "மதிப்பாய்வு செய்யப்பட்ட பதில்",
                      )}
                      <textarea
                        rows={6}
                        maxLength={1800}
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                      />
                    </label>
                    <p className="fine-print">
                      {pick(
                        lang,
                        "Cite only evidence that supports your response. State what remains unknown. This prototype cannot approve claims or make eligibility decisions.",
                        "உங்கள் பதிலை ஆதரிக்கும் ஆதாரங்களை மட்டும் குறிப்பிடவும். தெரியாதவற்றைக் குறிப்பிடவும். இந்த மாதிரி கோரிக்கைகளை அங்கீகரிக்கவோ தகுதியை முடிவு செய்யவோ முடியாது.",
                      )}
                    </p>
                    <button
                      className="primary"
                      disabled={busy || answer.length < 10 || !ids.length}
                      onClick={() => void publish()}
                    >
                      <CheckCircle2 size={17} />
                      {pick(
                        lang,
                        "Publish reviewed guidance",
                        "மதிப்பாய்வு வழிகாட்டுதலை வெளியிடவும்",
                      )}
                    </button>
                  </>
                )}
              </section>
            )}
          </div>
        </>
      )}
      {error && (
        <div role="alert" className="error">
          {error}
        </div>
      )}
    </>
  );
}
