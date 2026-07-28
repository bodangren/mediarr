# Specification: AI Release Parser Lockdown

**Track ID:** `bug_ai_release_parser_lockdown_20260728`
**Type:** Bug
**Spec mode:** Classic FR list

## Overview

Mediarr's AI release parser does not work in its shipped configuration, and has not
for as long as the current default has been in place. The AI layer silently degrades
to a 36-line regex on every call, and when it *does* return, a length mismatch can
attach one release's parse to a different release — which then feeds the auto-grab
score.

This track makes the AI layer actually run, makes it impossible for it to
mis-attribute a parse, and establishes an accuracy oracle so the model choice is a
measured decision rather than an assumption.

### Evidence

A live probe was run on 2026-07-28 against OpenRouter: 3 runs per arm, 8 real release
titles per run, `temperature=0`.

| Arm | Latency | Cost/1000 titles | Valid JSON | Alignment |
|---|---|---|---|---|
| `minimax/minimax-m2.7` **(current code default)** | 77–88s | $0.61 | 1/3 | — |
| `openrouter/free` **(current `.env.example` default)** | 31–35s | $0 | 3/3 | 6 of 8 |
| `openrouter/auto` | 14–21s | $4.41 | 3/3 | 3/3 OK |
| `openrouter/auto` + `require_parameters` | 3.9–4.4s | $0.047 | 3/3 | 3/3 OK |
| `mistralai/mistral-nemo` | 9–15s | $0.0043 | 3/3 | 7 of 8, twice |
| `google/gemini-2.5-flash-lite` | 2.4–3.1s | $0.047 | 3/3 | 3/3 OK |

Confirmed by source inspection:

- `server/src/services/ReleaseParserProvider.ts:5` — `DEFAULT_OPENROUTER_MODEL = 'minimax/minimax-m2.7'`.
- `.env` on this host sets **only** `OPENROUTER_API_KEY`. No `AI_GATEWAY_BASE_URL`, no
  `OPENROUTER_MODEL`. The live path is therefore OpenRouter at the hardcoded default.
- `ReleaseParser.ts:249` — `parse()` aborts at `AbortSignal.timeout(15000)`.
- `ReleaseParser.ts:279` — `parseBatch()` aborts at `AbortSignal.timeout(20000)`.

The configured model is **4–6× slower than its own abort deadline**. Every call times
out, every time. `parse()` then returns `regexFallback()`; `parseBatch()` returns `[]`.

Two amplifiers found during source inspection, not present in the original probe:

1. **`parse()` is a serial queue** (`ReleaseParser.ts:209`, `223–229`) with 3 attempts
   and 1s/2s backoff. One title costs ~48s of wall clock before falling to regex, and
   calls cannot overlap. `WantedSearchService` calls `parse()` once per candidate
   release inside a filter — 25 candidates is a ~20-minute stall on a single search.
2. **`parseFiles()` already has the length guard** that `parseBatch()` lacks
   (`ReleaseParser.ts:337` — `parsed.data.results.length === batch.length`). The fix
   for FR-2 therefore has a precedent in the same file.

### Why the misalignment matters

`MediaSearchService.ts:580` zips by position:

```ts
for (let i = 0; i < parsedBatch.length; i++) {
  const release = seededReleases[i];
  const parsed = parsedBatch[i];
  if (release && parsed) release.parsedRelease = parsed;
}
```

If the model drops title #3 of 8, results 4–8 shift up one slot and five releases
receive another release's parse. `parsedRelease.relevanceScore` is then used
**directly** as `confidenceScore` in `CustomFormatScoringEngine.scoreCandidateUnified()`,
and `RssMediaMonitor` / `WantedSearchService` auto-grab at `totalScore >= 50`. A
mis-attributed parse can therefore cause an automatic download of the wrong release.
The probe reproduced truncation on two separate models, so this is not hypothetical.

## Functional Requirements

### FR-1 — Golden release-title set

A committed fixture of real release titles with hand-verified expected parses.

- At least 40 titles covering: single episode, multi-episode (`S01E01E02`), season
  pack, complete series, movie, anime absolute numbering, disambiguation year
  (`Archer.2009`) vs. movie release year (`Oppenheimer.2023`), `NNxNN` form, 2160p/UHD
  (→ `resolution: "unknown"`), and `BluRay.REMUX` (→ `source: "REMUX"`, not a codec).
- Each entry carries the expected `ParsedRelease` fields and a `regexFallbackExpected`
  field recording what the offline regex is expected to produce (including `null`).
- Serves two consumers: an offline unit-test oracle (free, runs in CI) and the live
  accuracy benchmark of FR-5.

### FR-2 — `parseBatch()` cannot mis-attribute a parse

- The batch prompt instructs the model to echo the 1-based input index on each result;
  the batch schema accepts it.
- Results are matched to input titles **by echoed index**, never by array position.
- A result whose index is missing, out of range, or duplicated is discarded rather than
  guessed at.
- If no usable index is present on any result, `parseBatch()` falls back to a strict
  length check: `results.length === titles.length` or the whole batch is rejected —
  matching the existing `parseFiles()` behaviour.
- The return contract changes from "array positionally parallel to `titles`" to "array
  of `titles.length` slots, each either a parse or `null`". Call sites are updated.

### FR-3 — Timeouts are configurable and are not shorter than the work

- `parse()`, `parseBatch()`, and `parseFiles()` read their abort deadlines from
  configuration with documented defaults, instead of three hardcoded literals.
- Defaults are set with headroom over the measured latency of the pinned model.
- A startup warning is emitted when the resolved model is not a known-fast model, so a
  future `OPENROUTER_MODEL` override that reintroduces this defect is visible rather
  than silent.

### FR-4 — Default to a model that fits inside its deadline

> **AMENDED 2026-07-28 (during implementation).** This FR originally read "Pin
> `google/gemini-2.5-flash-lite`", and was implemented that way in commit `acc62f5`.
> The user rejected pinning on longevity grounds: a pinned model is eventually
> retired, and at that point OpenRouter errors, `parseBatch` returns all-null slots,
> and the app degrades **silently** — the exact failure this track exists to kill.
> That objection was correct and the original FR under-weighted it. The default is now
> a router. `openrouter/auto` was re-rejected (measured $4.41/1000 titles); the
> alternative of a pinned model plus an explicit fallback chain was offered and the
> user chose the router. See FR-8 for the failure-signal work this made necessary.

- `DEFAULT_OPENROUTER_MODEL` becomes `openrouter/pareto-code`, a router, so the parser
  survives retirement of any individual model.
- The router's `min_coding_score` (0–1 quality/cost dial) is sent explicitly on every
  request rather than left to the router's default, and defaults to the measured floor.
- Abort deadlines are raised to fit the router's measured latency with real headroom,
  since a router's backing model can change beneath a stable id.
- `.env.example` is updated: the `openrouter/free` gateway default is removed as a
  documented default, since it measured 31–35s against a 20s deadline **and** the
  localhost gateway it points at is not running.
- `OPENROUTER_MODEL` remains an override; this changes the default only.

### FR-8 — Cost-aware quality escalation *(added 2026-07-28)*

- Every request states its cost/quality preference explicitly via `min_coding_score`.
- The default is the **measured cheapest rung that parses correctly**, not a guess.
- On retry — meaning the cheap tier errored, timed out, or returned an unusable
  response — the dial rises by a fixed step so each attempt buys a stronger model
  instead of repeating the same failing request. Steady-state cost stays at the floor.
- Rationale: a sweep over the dial found every rung parsed the probe set correctly
  while cost varied 12.9×, so paying for quality up front buys nothing; paying for it
  only on failure buys recovery.

### FR-9 — Degradation must be loud *(added 2026-07-28)*

Provider errors, timeouts, unusable responses, escalations, and regex fallback were
all silent. A retired, rate-limited, or too-slow model was indistinguishable from a
healthy one — which is precisely why the original defect survived unnoticed.

- Each of those events logs an explicit, actionable error or warning.
- A call that consumes ≥60% of its deadline emits an early warning, so drift toward
  the timeout is visible *before* it starts failing. This is the durable guard for a
  router, whose backing model can change without the model id changing.
- Events are published to `ApiEventHub` as `parser:degraded` so the SSE/notification
  surface can show them.
- An observer that throws must never break parsing.

### FR-5 — Live accuracy benchmark

- A script, gated behind an explicit env flag so it never runs inside `vitest run`,
  parses the FR-1 golden set against a live model and reports per-field accuracy,
  latency, cost, JSON validity, and alignment.
- Reports accuracy per field (`title`, `year`, `seasonNumber`, `episodeNumbers`,
  `matchType`, `type`), not just a single pass/fail — a model that gets `title` right
  and `matchType` wrong fails differently from one that truncates.
- Supports comparing arms so the pinned choice can be re-verified when models change.

### FR-6 — `ReleaseParserProvider` test coverage

`ReleaseParserProvider.ts` is one of the 8 services in the open tech-debt row
(2026-07-26, "8 of 55 server services still lack a sibling `.test.ts`"). It is the file
this track changes most, so its coverage is claimed here rather than left to
`chore_remaining_server_service_coverage_20260728`.

- ≥80% branch coverage of the gateway → OpenRouter → disabled precedence chain,
  including every env-var fallback and the model-warning path from FR-3.

### FR-7 — Bounded concurrency for `parse()`

- The serial queue is replaced with a bounded-concurrency limiter (default 4).
- Per-call result correctness and the regex fallback on failure are preserved.
- Rationale: with the FR-4 model pinned, serial execution still costs ~75s for a
  25-release `WantedSearchService` filter. Serialisation was a defensible choice for
  rate-limit safety; a bound of 4 keeps that protection at a fraction of the latency.

## Non-Functional Requirements

- **NFR-1** — No live network calls in the automated suite. Every FR-1..FR-4, FR-6, and
  FR-7 test runs offline against mocks. FR-5's benchmark is env-gated.
- **NFR-2** — Cost: at the FR-4 model, realistic usage (50 interactive searches/day at
  25 titles each, plus RSS and wanted-search) stays under $2/month.
- **NFR-3** — The regex fallback remains fully functional with no AI provider
  configured; this track must not make AI a hard dependency.

## Acceptance Criteria

1. A truncated batch response (model returns 7 results for 8 titles) attaches parses
   only to the titles they were produced for, and never to any other release. Proven
   by a test that fails against the current code.
2. `parseBatch()` with a well-formed 8-of-8 response still attaches all 8 parses.
3. The default model resolves to `google/gemini-2.5-flash-lite` with no
   `OPENROUTER_MODEL` set, proven by a `ReleaseParserProvider` test.
4. All three abort deadlines are configuration-driven, with defaults exceeding the
   pinned model's measured p100 latency by at least 3×.
5. The golden set has ≥40 entries and the regex fallback is asserted against every one
   of them.
6. `parse()` issues up to 4 concurrent AI calls and returns each caller its own result.
7. The live benchmark script runs against the golden set and its output is recorded in
   this track's directory.
8. Root suite green: `CI=true npx vitest run server/src tests`.
9. `npx tsc -p server/tsconfig.json --noEmit` → 0 diagnostics.

## Out of Scope

- **Prompt-quality tuning.** The benchmark may reveal that a cheap model is inaccurate
  on specific fields. Acting on that is a follow-up; this track establishes the
  measurement, it does not chase the number.
- **`openrouter/auto` + `require_parameters`.** It routes to the same model FR-4 pins,
  so it buys nothing over pinning while adding routing variance and beta risk. Recorded
  in tech-debt as the fallback if the pinned model is ever withdrawn.
- **The local AI gateway.** `AI_GATEWAY_BASE_URL` support stays as-is. The gateway is
  not running on this host and is not being revived here.
- **Auto-grab threshold tuning.** `AUTO_GRAB_THRESHOLD = 50` is untouched.
- **Key rotation.** The `OPENROUTER_API_KEY` exposed in a prior transcript needs
  rotating; that is an operator action, tracked separately.
