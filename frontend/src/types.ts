export type Lang = "en" | "ta";
export type Profile = {
  district: string;
  crop: string;
  season: string;
  stage: string;
  documents: string[];
  situation?: "enrol" | "damaged" | "waiting" | "problem" | null;
  loanee?: "yes" | "no" | "unsure" | null;
  damage_cause?: "flood" | "cyclone" | "drought" | "pest" | "other" | null;
  damage_when?: "under_3_days" | "3_to_14_days" | "over_14_days" | "harvested" | null;
};
export type Evidence = {
  id: string;
  source_id: string;
  title: string;
  url: string;
  page: number | null;
  text: string;
  kind: string;
  published: string | null;
  retrieved_at: string;
  sha256: string;
  districts: string[];
  rank_score: number;
};
export type Result = {
  status: string;
  reason: string;
  answer: string;
  claims: { text: string; citation_ids: string[]; original_text?: string }[];
  actions: { text: string; citation_ids: string[] }[];
  evidence: Evidence[];
  trace: string[];
  missing_information: string[];
  suggested_reply?: string;
  checklist?: string[];
  show_plan?: boolean;
  language: Lang;
  engine: string;
  elapsed_ms: number;
  redacted: boolean;
};
export type Case = {
  id: string;
  profile: Profile;
  plan: { question: string; result: Result; created: string } | null;
  messages: { id: string; question: string; result: Result; created: string }[];
  reviews: {
    id: string;
    state: string;
    response: string;
    citations: Evidence[];
    created: string;
    resolved: string | null;
  }[];
  events: { kind: string; created: string }[];
};
export type Session = { id: string; token: string };
export type Health = {
  llm_configured: boolean;
  sarvam_configured: boolean;
  model: string;
  chunks: number;
  retrieval: string;
  districts: string[];
};
export const districts = ["Thanjavur", "Tiruvarur", "Nagapattinam"];
export const districtTamil: Record<string, string> = {
  Thanjavur: "தஞ்சாவூர்",
  Tiruvarur: "திருவாரூர்",
  Nagapattinam: "நாகப்பட்டினம்",
};
export const stages = [
  "coverage",
  "documents",
  "reporting",
  "follow_up",
  "grievance",
];
export const stageNames: Record<string, [string, string]> = {
  coverage: ["Understand coverage", "காப்பீட்டை அறிதல்"],
  documents: ["Prepare documents", "ஆவணத் தயாரிப்பு"],
  reporting: ["Report a loss", "இழப்பைப் பதிவு செய்தல்"],
  follow_up: ["Follow up", "தொடர் விசாரணை"],
  grievance: ["Resolve an issue", "குறை தீர்வு"],
};
export const initialProfile: Profile = {
  district: "Thanjavur",
  crop: "Paddy",
  season: "Not specified",
  stage: "coverage",
  documents: [],
};
export const pick = (lang: Lang, en: string, ta: string) =>
  lang === "en" ? en : ta;
