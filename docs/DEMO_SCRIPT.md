# Five-minute Demo Day walkthrough

## Before presenting

1. Run setup, enter real AI Credits and Sarvam keys in `.env`, restart the app and test both languages. Keep your local reviewer token ready without showing it on the projector.
2. Use synthetic information only. Choose Thanjavur, Paddy and a season. The season selection does not assert coverage.
3. Open the source library to verify ingestion. Internet is needed for live providers and for opening original source URLs.
4. Rehearse the questions below. Answers depend on the provider and current evidence; do not claim a live-tested answer unless you have actually run it.

## 0:00–0:40 — Whole journey

Show the overview and five stages. Say: “This is an independent assistance workspace across the insurance journey. We demonstrate understanding, preparation, follow-up and escalation. The official insurer or authority still makes the decisions.”

Choose one of the three districts and start a case. Keep the consent checkbox visible before sending a question.

## 0:40–1:40 — Grounded assistance

Ask: **How can I raise a crop-insurance grievance?**

Inspect the generated explanation, its numbered citations and an expanded source passage. Open a cited page if useful. Show the processing trace: district filtering, retrieval, structured generation and grounding checks.

Optional second question: **What is the difference between area-yield and localised losses?** Explain that reporting routes and deadlines depend on the pathway; there is no universal deadline asserted for every claim.

If real provider keys are absent, the app displays only retrieved passages and “No AI answer issued.” Present that honestly as a retrieval demonstration, not as a live RAG generation demo.

## 1:40–2:20 — Tamil

Switch the interface to Tamil and ask: **பயிர்க் காப்பீட்டுக் குறையை எப்படி பதிவு செய்வது?**

With Sarvam configured, demonstrate the translated answer and the unchanged supporting source. Optionally record a short question; inspect/edit the transcript before submitting. Do not record the audience or send real personal details.

## 2:20–3:00 — Case continuity

Open My case. Mark one preparation item ready, record preparation and download the assistance-request draft. Show that the diary persists. State that these entries describe the user's own actions; they are not live insurer status updates.

## 3:00–4:30 — Human in the loop

Ask: **What is the premium for my village this season?**

The assistant must withhold a current figure because the applicable village/season notification is missing. It creates a review request.

Open Reviewer workspace, enter your local token and select that request. Inspect the retrieved PMFBY notification passage (in the bundled snapshot, page 33). Select the passage that supports the following clarification, then publish:

> The PMFBY framework requires the State to notify the crops and areas covered for the season. The indexed general documents do not establish the premium for your village this season. Obtain the applicable crop, village and season notification before relying on a premium figure.

Return to My case and refresh review updates. Show the separately attributed human response with its supporting evidence. This exact local queue/correction/display flow was browser-tested without a provider key.

## 4:30–5:00 — Explain the proof of concept

“We have demonstrated document ingestion, retrieval, source-backed generation plumbing, bilingual interaction and a review loop. We have not claimed official transaction integrations, field accuracy or automatic eligibility decisions.”

If asked what RAG contributes: “The answer is constrained by retrieved government passages. We show the evidence, check claims against it and escalate when the evidence cannot answer the question.”

If asked about commercial alignment: “Farmers use the independent assistance interface. The proposed paying customer is the Agriculture Department for software deployment and service capacity. The prototype does not give insurers control of farmer guidance.”
