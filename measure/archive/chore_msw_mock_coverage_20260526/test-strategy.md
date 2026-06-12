# Test Strategy: MSW Mock Coverage for Backend Routes

> **Note:** Track is `deferred` and explicitly tagged "merge candidate" with
> `chore_frontend_component_test_gaps_20260526`. Handlers are test infrastructure,
> not production code (spec §"Out of Scope"). Plan acceptance is: **`CI=true npm test` GREEN** plus
> "no unhandled MSW warnings". This strategy reflects that intent.

## 0. Build-Graph Findings That Shaped The Strategy

- `build-graph query` confirmed **245 route nodes**; ~36 are mocked in `handlers.ts`,
  the other ~209 live under `server/src/api/routes/*Routes.ts`. The spec's gap table is accurate.
- `build-graph callers handlers` / `inspect ./app/src/lib/msw/server.ts`: **`server.ts` has zero importers** in
  `app/src/**`. Existing API tests (e.g. `movieApi.test.ts:5`) use `vi.mock('./httpClient')`, **never `msw/node`**.
  → Handlers added today are dead code until a consumer wires them in. **Phase S0 (below) must wire MSW into
  `app/src/test/setup.ts` before any handler is added**, otherwise GREEN tests prove nothing.
- `build-graph stats`: top-imported file is `httpClient.ts` (55 importers). All API modules share `ApiHttpClient`
  → MSW intercepts at `fetch`, which `httpClient.ts` calls, so a single setup hook covers every API module.
- Frontend `routeMap.ts` (`app/src/lib/api/routeMap.ts:1`) is the canonical URL source. Pulling handler paths
  from `routeMap` (not raw strings) prevents drift between client and mock.
- Server routes already expose response shape via Fastify schemas; reuse those shapes in mock payloads to keep
  contracts honest.

## 1. Testing Pyramid Per Phase

This is a **fixture/infrastructure track**, not a feature. The pyramid applies to *consumers*, not to the
handlers themselves. Per phase:

- **Unit (vitest, mocked `httpClient`)** — already covers `*Api.test.ts`. No change. Handlers are NOT consumed here.
- **Integration (vitest + MSW + jsdom)** — the target tier. New/existing component & hook tests opt in by
  importing `server` from `app/src/lib/msw/server.ts`. Each phase should land at least **1 smoke integration
  test per domain** (e.g. `MoviesList.integration.test.tsx` in S1) to prove the handlers are actually exercised.
- **E2E** — out of scope.

> Without that smoke test, `CI=true npm test GREEN` is vacuous: the handlers compile but never run.

## 2. Shared Fixtures & Mocks

- **Single source of dataset state:** `factories.ts → createMockDataset()` (seeded RNG, deterministic).
  Extend this file rather than inlining `Array.from(...)` literals in `handlers.ts`. New domains
  (collections, customFormats, importLists, backups, qualityProfiles, subtitles, tasks, updates, logs)
  each need a `MockX` interface + `buildX()` + dataset field — mirror the existing pattern.
- **Shared response helpers:** `sendSuccess` / `sendPaginated` / `sendError` already enforce the
  `{ ok, data, meta?, error? }` envelope. **All new handlers must use them** — do not return raw
  `HttpResponse.json(...)` (guardrail in §4).
- **URL constants:** import literal paths from `routeMap.ts` where the route is parameter-free, e.g.
  `http.get(routeMap.movies, …)`. For parameterized routes, hard-code with `:id` but co-locate a comment
  pointing at the `routeMap.*` factory.
- **Test setup hook (Phase S0, see §5):** standard MSW lifecycle (`beforeAll listen`, `afterEach
  resetHandlers`, `afterAll close`) added once to `app/src/test/setup.ts`, with `onUnhandledRequest: 'error'`.
  That error mode is what makes "no unhandled MSW warnings" verifiable.

## 3. Cross-Phase Edge Cases & Dependencies

- **Duplicate path collisions (already a bug):** `GET /api/events/stream` exists in both `handlers.ts:464`
  and would be re-added by S3. `GET /api/subtitles/search` is in S1's existing handler set and S4 will
  re-list it. Each phase MUST grep `handlers.ts` before adding to avoid silent overrides.
- **Stateful mutations vs `resetHandlers`:** the dataset is module-singleton (line 475
  `createHandlers('deterministic')`). Cross-test pollution will surface in S1 (POST /api/movies mutates
  `dataset.movies`). Strategy: in Phase S0, change the export to a factory called from a
  `beforeEach(() => server.use(...createHandlers()))` reset, OR re-seed `dataset` inside `resetHandlers`.
  Pick one and document it before S1 ships.
- **Binary/blob endpoints (S3, S5):** `GET /api/system/events/export`, `GET /api/activity/export`,
  `POST /api/backups/:id/download`, `GET /api/logs/files/:filename/download`, `GET /api/images/proxy`,
  `GET /api/stream/:id` — return `new HttpResponse(new Blob([...]), { headers: { 'content-type': ... }})`,
  NOT `HttpResponse.json`. Add one shared `sendBlob()` helper in S3 and reuse.
- **SSE (`GET /api/events/stream`):** already handled with empty body + `text/event-stream`. Do not "improve" it.
- **Auth-shaped errors:** server returns `{ ok:false, error:{ code, message, retryable, details }}`. Handlers
  that simulate failures (e.g. `POST /api/indexers/:id/test`, `POST /api/subtitles/providers/:id/test`) must
  match that envelope verbatim.
- **Phase ordering:** S1 → S2 → S3 → S4 → S5 is independent except for **S0 (setup) blocking all of them**
  and the shared `dataset` decision above. Phases can otherwise be parallelized once S0 lands.

## 4. Architecture Guardrails

1. **No new files outside `app/src/lib/msw/`** for handler code. Factories grow in `factories.ts`; handlers
   grow in `handlers.ts`. If `handlers.ts` exceeds ~1000 lines, split by domain into
   `handlers/<domain>.ts` and re-export an aggregated array — do **not** scatter handlers across the tree.
2. **No production code changes.** This track must not touch `server/src/**`, `routeMap.ts`, `httpClient.ts`,
   or any `*Api.ts`. If a handler can't match a real response, fix the test, not the production code.
3. **Envelope discipline.** Every handler returns through `sendSuccess`/`sendPaginated`/`sendError`/`sendBlob`.
   Lint rule (manual review): grep `HttpResponse.json(` after each phase — should only appear inside those helpers.
4. **`onUnhandledRequest: 'error'` is the contract.** Once enabled, any missing handler fails the suite —
   this is the mechanism that enforces "no unhandled MSW warnings" from the plan.
5. **Deterministic only.** `createHandlers('deterministic')`; never call with `'random'` in tests.
6. **Do not invent backend behavior.** When in doubt about response shape, read the corresponding
   `server/src/api/routes/*Routes.ts` Fastify schema first.

## 5. Per-Phase Test Approach Notes

**Phase S0 — Setup (NEW, prerequisite, ~30min):** Wire `server.listen({ onUnhandledRequest: 'error' })`
into `app/src/test/setup.ts`; decide dataset-reset policy (recommend: re-create `handlers` in `beforeEach`).
Add a 1-test smoke spec that hits an existing handler (`GET /api/movies`) through real `fetch` to prove
interception works. This MUST land before S1, otherwise the rest of the plan is unobservable.

**Phase S1 — Core domains:** Add 1 component-level integration test per domain
(`MoviesList`, `SeriesList`, one indexer screen). These are the only tests that prove MSW handlers run.

**Phase S2 — Settings & config:** Most response shapes are large nested objects — extend `MockDataset.settings`
incrementally. Smoke test: `SettingsPage` renders without any unhandled-request error.

**Phase S3 — System & operations:** Introduce `sendBlob()` here for export endpoints. Watch for the
`/api/events/stream` collision called out in §3. Smoke test: System/Tasks/Activity page mount.

**Phase S4 — Subtitles & playback:** Highest route count (~25). Group factory data:
`MockSubtitleProvider`, `MockWantedSubtitle`, `MockPlaybackManifest`. Smoke test: Subtitle Wanted page +
one playback hook.

**Phase S5 — Remaining domains:** Largest phase (~50 routes). Push for thin handlers (return seeded array,
no logic). Reuse `paginate()` everywhere. Final integration smoke: open Backups, Collections, Updates,
ImportLists, Calendar with `onUnhandledRequest: 'error'` active — silence is success.

**Phase S6 — Verification:** Beyond `CI=true npm test`, run with `--reporter=verbose` and grep stderr for
"unhandled" / "Cannot find a handler". Both must be absent. Update `tech-debt.md` and
`measure/tracks.md` (remove "merge candidate" tag if shipped standalone).
