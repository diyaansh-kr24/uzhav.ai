import { useState } from "react";
import { ArrowLeft, ArrowRight, LoaderCircle, Sprout } from "lucide-react";
import { pick, districts, districtTamil, initialProfile, type Lang, type Profile } from "./types";

type Option = { value: string; en: string; ta: string; hint?: [string, string] };
type Step = {
  key: keyof Profile;
  en: string;
  ta: string;
  options: Option[];
};

const STEPS: Step[] = [
  {
    key: "district",
    en: "Where is your farm?",
    ta: "உங்கள் வயல் எங்கே உள்ளது?",
    options: districts.map((d) => ({ value: d, en: d, ta: districtTamil[d] })),
  },
  {
    key: "season",
    en: "Which season is this about?",
    ta: "எந்தப் பருவத்தைப் பற்றியது?",
    options: [
      { value: "Kuruvai 2026", en: "Kuruvai 2026", ta: "குறுவை 2026", hint: ["June – September", "ஜூன் – செப்டம்பர்"] },
      { value: "Samba / Thaladi 2026–27", en: "Samba / Thaladi 2026–27", ta: "சம்பா / தாளடி 2026–27", hint: ["August – February", "ஆகஸ்ட் – பிப்ரவரி"] },
      { value: "Not specified", en: "Not sure", ta: "தெரியவில்லை" },
    ],
  },
  {
    key: "situation",
    en: "What is happening right now?",
    ta: "இப்போது என்ன நிலை?",
    options: [
      { value: "enrol", en: "I want to get my crop insured", ta: "என் பயிரைக் காப்பீடு செய்ய வேண்டும்" },
      { value: "damaged", en: "My crop has been damaged", ta: "என் பயிர் பாதிக்கப்பட்டுள்ளது" },
      { value: "waiting", en: "I reported a loss and am waiting", ta: "இழப்பைப் பதிவு செய்து காத்திருக்கிறேன்" },
      { value: "problem", en: "My claim was rejected, delayed or seems wrong", ta: "என் கோரிக்கை நிராகரிக்கப்பட்டது / தாமதமானது / தவறாக உள்ளது" },
    ],
  },
  {
    key: "loanee",
    en: "Do you have a crop loan (KCC) from a bank?",
    ta: "வங்கியில் பயிர்க் கடன் (KCC) உள்ளதா?",
    options: [
      { value: "yes", en: "Yes", ta: "ஆம்", hint: ["The bank usually enrols you", "பொதுவாக வங்கியே பதிவு செய்யும்"] },
      { value: "no", en: "No", ta: "இல்லை", hint: ["You enrol yourself", "நீங்களே பதிவு செய்ய வேண்டும்"] },
      { value: "unsure", en: "Not sure", ta: "தெரியவில்லை" },
    ],
  },
  {
    key: "damage_cause",
    en: "What damaged the crop?",
    ta: "பயிர் எதனால் பாதிக்கப்பட்டது?",
    options: [
      { value: "flood", en: "Flood or heavy rain", ta: "வெள்ளம் / கனமழை" },
      { value: "cyclone", en: "Cyclone", ta: "புயல்" },
      { value: "drought", en: "Drought / no water", ta: "வறட்சி / நீர் இல்லை" },
      { value: "pest", en: "Pests or disease", ta: "பூச்சி / நோய்" },
      { value: "other", en: "Something else", ta: "வேறு காரணம்" },
    ],
  },
  {
    key: "damage_when",
    en: "When did the damage happen?",
    ta: "பாதிப்பு எப்போது ஏற்பட்டது?",
    options: [
      { value: "under_3_days", en: "Less than 3 days ago", ta: "3 நாட்களுக்குள்", hint: ["Report quickly — time limits apply", "விரைவில் பதிவு செய்யவும் — கால வரம்பு உண்டு"] },
      { value: "3_to_14_days", en: "3 to 14 days ago", ta: "3 முதல் 14 நாட்களுக்கு முன்" },
      { value: "over_14_days", en: "More than 14 days ago", ta: "14 நாட்களுக்கு மேல்" },
      { value: "harvested", en: "After harvest, while drying in the field", ta: "அறுவடைக்குப் பின், வயலில் உலர்த்தும்போது" },
    ],
  },
];

export default function Intake({
  lang,
  busy,
  onDone,
  onCancel,
}: {
  lang: Lang;
  busy: boolean;
  onDone: (profile: Profile) => void;
  onCancel: () => void;
}) {
  const [profile, setProfile] = useState<Profile>({ ...initialProfile });
  const [index, setIndex] = useState(0);
  const steps = STEPS.filter(
    (s) =>
      profile.situation === "damaged" ||
      (s.key !== "damage_cause" && s.key !== "damage_when"),
  );
  const step = steps[index];
  const total = steps.length + 1;
  const label = (o: Option) => pick(lang, o.en, o.ta);
  const answer = (s: Step) => {
    const o = s.options.find((x) => x.value === profile[s.key]);
    return o ? label(o) : "—";
  };

  function choose(value: string) {
    const next = { ...profile, [step.key]: value } as Profile;
    if (step.key === "situation" && value !== "damaged") {
      next.damage_cause = null;
      next.damage_when = null;
    }
    setProfile(next);
    setIndex(index + 1);
  }

  return (
    <section className="panel intake">
      <div className="intake-top">
        <button
          className="text-button"
          onClick={() => (index === 0 ? onCancel() : setIndex(index - 1))}
          disabled={busy}
        >
          <ArrowLeft size={16} />
          {pick(lang, "Back", "பின்செல்")}
        </button>
        <span className="intake-count">
          {pick(lang, "Step", "படி")} {Math.min(index + 1, total)} / {total}
        </span>
      </div>
      <div className="intake-progress" aria-hidden>
        <span style={{ width: `${(Math.min(index + 1, total) / total) * 100}%` }} />
      </div>

      {step ? (
        <>
          <h1>{pick(lang, step.en, step.ta)}</h1>
          <div className="intake-options">
            {step.options.map((o) => (
              <button
                key={o.value}
                className={"intake-option " + (profile[step.key] === o.value ? "selected" : "")}
                onClick={() => choose(o.value)}
              >
                <span>
                  {label(o)}
                  {o.hint && <small>{pick(lang, o.hint[0], o.hint[1])}</small>}
                </span>
                <ArrowRight size={18} />
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <h1>{pick(lang, "Check your answers", "உங்கள் பதில்களைச் சரிபார்க்கவும்")}</h1>
          <dl className="intake-summary">
            {steps.map((s, i) => (
              <div key={s.key}>
                <dt>{pick(lang, s.en, s.ta)}</dt>
                <dd>
                  {answer(s)}
                  <button className="text-button" onClick={() => setIndex(i)} disabled={busy}>
                    {pick(lang, "Change", "மாற்று")}
                  </button>
                </dd>
              </div>
            ))}
          </dl>
          <button
            className="primary large"
            disabled={busy}
            onClick={() => onDone(profile)}
          >
            {busy ? <LoaderCircle className="spin" size={19} /> : <Sprout size={19} />}
            {busy
              ? pick(lang, "Preparing your plan…", "உங்கள் திட்டம் தயாராகிறது…")
              : pick(lang, "Get my plan", "என் திட்டத்தைப் பெறு")}
          </button>
        </>
      )}
    </section>
  );
}
