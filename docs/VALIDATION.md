# Validation record

Checked locally on 7 November 2026. Python 3.13, Windows, React/Vite production build.

## Executed

- **29 automated tests passed.** Coverage includes district and archive filtering, invalid citations/quotes/numbers, identifier redaction, prompt-injection patterns, missing current notifications, missing provider keys, structured generation with stubbed providers, grounding-check refusal, provider failures, Tamil translation and numeric integrity, per-case access isolation, consent, reviewer access, human-review round trip with evidence, duplicate review rejection, case events/drafts/deletion, cross-site writes and request size limits.
- Provider contract tests check AI Credits model/request format, structured-response parsing, Sarvam translation chunk sizes/language fields and speech file formats. These use stubs, not paid requests.
- TypeScript compile check and Vite production build passed.
- The six source downloads produced 838 chunks, including 110 archived chunks excluded from answer retrieval. Manifest records provenance and source hashes.
- Browser walkthrough: started a Thanjavur case; asked a grievance question; inspected real retrieved PMFBY passages; confirmed that no generated answer appeared without credentials.
- Browser walkthrough: asked a current premium question; saw it in the protected review queue; selected a page-33 source; published a human clarification; saw the clarification and source return to the same farmer case.
- Browser walkthrough: checked a document-readiness item, recorded preparation and verified the diary; inspected Tamil navigation and a 390-pixel-wide mobile viewport. No horizontal document overflow was observed in that mobile check.

The test run emitted one dependency deprecation warning about Starlette's httpx test-client compatibility. It did not fail the tests.

## Not established

- Live DeepSeek or Sarvam account access, model availability for the user's account, output quality, speech transcription, latency or costs. No real API keys were supplied.
- Accuracy on a labelled farmer-question benchmark, native Tamil quality, field usability or impact on claim outcomes.
- Coverage, premium, deadline or insurer for a current village/season notification.
- Production security, concurrent load capacity, public multi-user deployment or official system integration.

The screenshot is from the actual running UI. Test fixtures and simulated provider replies are not presented as production answers or evaluation evidence of model quality.
