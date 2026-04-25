# Validation Integrity Findings (Gemini)

**Date:** 2026-02-12
**Executor:** Gemini Agent

## Summary
Analysis of test suite reveals high mock density in critical core services, suggesting "false confidence" where unit tests pass but runtime wiring is broken or untested.

## High-Risk False Confidence Zones (Mock Ratio > 2.0)

The following areas rely heavily on mocks (`vi.mock`, `spyOn`, etc.) relative to the number of tests. This often hides integration failures (as seen with `IndexerFactory`).

| Test File | Mock Ratio | Domain | Risk |
| :--- | :--- | :--- | :--- |
| `torrent-api.test.js` | 5.5 | Torrent Client Integration | **Critical**: API behavior is largely simulated; actual client communication unverified. |
| `tv-search-service.test.js` | 4.0 | Metadata/Search | **Critical**: Search logic verification relies on mocked provider responses. |
| `activity-event-emission.test.js` | 3.8 | Observability | **High**: Event bus wiring verified via spies, not actual subscribers. |
| `subtitle-provider-factory.test.js` | 3.5 | Subtitles | **High**: Provider instantiation and selection logic is mocked. |
| `api-handlers.test.ts` | 2.5 | API Contract | **Medium**: Route handlers verify logic but mock the service layer. |
| `import-manager.test.js` | 2.5 | Media Import | **High**: File system operations and state transitions are mocked. |
| `torrent-manager-sync-loop.test.js` | 2.5 | Queue Management | **High**: The core sync loop driving the queue is tested against mock repositories. |

## Interpretation
The high mock ratio in `tv-search-service.test.js` (4.0) directly correlates with the "Missing" parity finding for TV search—tests pass because they mock the provider, but the real provider fails (or is unimplemented/misconfigured).

Similarly, `torrent-api.test.js` (5.5) suggests that while the internal logic of the torrent API adapter is tested, the actual interaction with a real torrent client (or even a realistic simulation of one) is absent, posing a risk for the "Release Grab" workflow.

## Recommendations
1.  **Introduce Integration Tests:** Create tests that instantiate the full service stack (like `IndexerFactory` in our probe) without mocks for internal services.
2.  **Contract Tests for External APIs:** Use a tool like Polly.js or Nock with recorded fixtures rather than manual `vi.mock` for `HttpClient`, ensuring `MetadataProvider` and `TorrentClient` work against real API shapes.
3.  **End-to-End Scenarios:** Track 7F (E2E Hardening) must prioritize flows covering these high-mock areas (Search -> Grab -> Queue -> Import).
