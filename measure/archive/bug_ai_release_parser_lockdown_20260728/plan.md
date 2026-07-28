# Implementation Plan: AI Release Parser Lockdown

**Track ID:** `bug_ai_release_parser_lockdown_20260728`
**Spec:** [./spec.md](./spec.md)

> `Note: graph.db is stale (>24h, mtime 2026-07-24) — blast-radius probe skipped; no
> _Blast radius:_ lines in this plan.`

> **Gate note:** `measure/generate.sh` and `measure/doctor.sh` do not exist in this
> repo. Phase 6 substitutes the real gates used by every recent track:
> `CI=true npx vitest run server/src tests` and
> `npx tsc -p server/tsconfig.json --noEmit`.

---

## Phase 1: Contract & Schema Definition

- [x] Task: Build the golden release-title set [fe96f03]
    - [x] Create `server/src/services/__fixtures__/releaseParserGolden.ts` with ≥40 real titles
    - [x] Cover: single episode, multi-episode `S01E01E02`, `NNxNN`, season pack, complete series, movie, anime absolute numbering, `Archer.2009` vs `Oppenheimer.2023`, 2160p/UHD → `resolution: "unknown"`, `BluRay.REMUX` → `source: "REMUX"`
    - [x] Each entry: `{ title, expected: ParsedRelease, regexFallbackExpected: ParsedRelease | null, notes }`
    - [x] Export a typed accessor; assert shape against `ParsedReleaseSchema` at module load
- [x] Task: Define the indexed batch-response contract [c7c97be]
    - [x] Extend the batch item schema with a nullable 1-based `index` field
    - [x] Update `BATCH_PROMPT` to require the echoed index on every result
    - [x] Define the new `parseBatch()` return type: `(ParsedReleaseWithScore | null)[]`, length === `titles.length`
- [x] Task: Define the parser runtime-configuration contract [4543f29]
    - [x] Add a `ReleaseParserRuntimeConfig` type: `parseTimeoutMs`, `batchTimeoutMs`, `filesTimeoutMs`, `maxConcurrency`
    - [x] Document defaults and the env vars that override them
    - [x] Define the known-fast model allowlist used by the FR-3 startup warning

## Phase 2: Test (Red)

- [x] Task: Red tests for batch alignment (FR-2) [607b390, + MediaSearchService integration guard]
    - [x] Test: model returns 7 indexed results for 8 titles → each parse lands on its own title, slot 3 is `null`
    - [x] Test: model returns 8 indexed results out of order → all 8 land correctly
    - [x] Test: duplicate index → both discarded, no mis-attribution
    - [x] Test: index out of range / non-integer → discarded (`it.each`: 0, -1, 9, 2.5)
    - [x] Test: no index on any result + length mismatch → whole batch rejected (`[]`-equivalent, all `null`)
    - [x] Test: no index on any result + exact length match → positional zip still honoured
    - [x] Test in `MediaSearchService.batchAlignment.test.ts`: truncated batch never sets `parsedRelease` on the wrong release; verified by mutation (9 tests fail under a reintroduced positional zip)
    - [x] Confirm all fail against current code
- [x] Task: Red tests for configurable timeouts and model default (FR-3, FR-4) [607b390]
    - [x] Test: default resolved model is `google/gemini-2.5-flash-lite` with no `OPENROUTER_MODEL`
    - [x] Test: `OPENROUTER_MODEL` override still wins
    - [x] Test: each of the three deadlines is read from config, asserted via the `abortSignal` passed to `generateText`
    - [x] Test: a model outside the known-fast allowlist emits the startup warning exactly once
    - [x] Confirm all fail against current code
- [x] Task: Golden-set regression tests for the regex fallback (FR-1) [fe96f03]
    - [x] Table-driven test asserting `regexFallback` against every `regexFallbackExpected` in the golden set
    - [x] Runs with AI disabled — no mocks, no network
- [x] Task: `ReleaseParserProvider` sibling test file (FR-6) [b641b62]
    - [x] Create `server/src/services/ReleaseParserProvider.test.ts`
    - [x] Cover gateway path, OpenRouter path, disabled path, and every env fallback (`AI_GATEWAY_MODEL` → `OPENROUTER_MODEL`; `AI_GATEWAY_API_KEY` → `API_SECRET_KEY` → `local-dev-key`)
    - [x] Target ≥80% branch coverage

## Phase 3: Implement [checkpoint: acc62f5]

- [x] Task: Implement indexed batch alignment in `parseBatch()` [c926139]
    - [x] Build a `titles.length`-sized result array pre-filled with `null`
    - [x] Place each result by its echoed index; discard missing/duplicate/out-of-range
    - [x] Preserve the strict-length positional path for index-less responses
    - [x] Turn Phase 2 alignment tests green
- [x] Task: Update `MediaSearchService` for the nullable-slot contract [c926139]
    - [x] Replace the positional zip at `MediaSearchService.ts:580` with slot-wise assignment that skips `null`
    - [x] Verify `applyUnifiedScoring` still falls back to Levenshtein when `parsedRelease` is absent
- [x] Task: Implement configurable timeouts and the model warning [c926139, 593c169]
    - [x] Replace the three `AbortSignal.timeout(...)` literals with config reads
    - [x] Emit the known-fast-model warning from `resolveReleaseParserAiConfig()`
- [x] Task: Pin the default model and update environment docs [acc62f5]
    - [x] `DEFAULT_OPENROUTER_MODEL` → `google/gemini-2.5-flash-lite`
    - [x] Update `.env.example`: drop `openrouter/free` as a documented default, document `OPENROUTER_MODEL` and the timeout overrides
    - [x] Note the measured latency/cost basis in a comment so the pin is traceable to evidence

## Phase 4: Bounded Concurrency (FR-7) [checkpoint: a63ea54]

- [x] Task: Red test for bounded concurrency [a63ea54]
    - [x] Test: 10 concurrent `parse()` calls issue at most 4 in-flight `generateText` calls
    - [x] Test: each caller receives its own result, not another caller's
    - [x] Test: one failing call still falls back to regex and does not poison siblings
- [x] Task: Replace the serial queue with a bounded limiter [a63ea54]
    - [x] Swap the `this.queue` promise chain for a semaphore with configurable `maxConcurrency` (default 4)
    - [x] Turn Phase 4 tests green
    - [x] Re-run the full `ReleaseParser.test.ts` suite — the existing serial-ordering tests must be reconciled deliberately, not deleted

## Phase 5b: Router Migration, Escalation & Loud Failure (FR-4 amended, FR-8, FR-9)

> Added 2026-07-28 mid-implementation. The user rejected model pinning on longevity
> grounds after Phase 3 had already shipped the pin (`acc62f5`). See the amendment note
> on FR-4 in spec.md.

- [x] Task: Switch the default from a pinned model to the pareto router
    - [x] `DEFAULT_OPENROUTER_MODEL` → `openrouter/pareto-code`
    - [x] Attach the `pareto-router` plugin with an explicit `min_coding_score` via `extraBody`
    - [x] Raise deadlines for router latency (parse 30s, batch 60s, files 90s)
- [x] Task: Measure the quality/cost dial and default to the cheapest correct rung
    - [x] Sweep `min_coding_score` 0/0.25/0.5/0.75/1 against real titles, recording routed model, latency, cost, exactness
    - [x] Default to the measured floor (0) and pin the table in source
- [x] Task: Escalate quality on retry (FR-8)
    - [x] `_parseSingle` raises the dial by `RETRY_SCORE_STEP` per attempt
    - [x] `parseBatch` performs one escalated retry on error or unusable response
- [x] Task: Make degradation loud (FR-9)
    - [x] `ParserDegradation` union + `onReleaseParserDegraded` observer
    - [x] Classify timeouts vs provider errors; warn at ≥60% of deadline
    - [x] Publish `parser:degraded` from `main.ts` via `ApiEventHub`
- [x] Task: Tests for the router, escalation, and degradation reporting [pending-sha]

## Phase 5: Live Accuracy Benchmark (FR-5)

- [x] Task: Build the env-gated benchmark script
    - [x] Create `scripts/benchmark-release-parser.ts`, gated on `RELEASE_PARSER_BENCHMARK=true`
    - [x] Use dynamic `import()` for anything under `server/` (tech-debt row 2026-07-27: static `scripts/` → `server/` imports break at runtime)
    - [x] Report per-field accuracy, latency, token cost, JSON validity, alignment
    - [x] Support `--model` so arms can be compared
    - [x] Add an `npm run benchmark:parser` script
    - Caveat: the env gate (no `RELEASE_PARSER_BENCHMARK` → print instructions, exit 0, zero API
      calls) is empirically confirmed. The **`exit 1` "no provider configured" branch is verified
      by code inspection only** — `import 'dotenv/config'` reloads `OPENROUTER_API_KEY` from `.env`,
      so `env -u` cannot force it, and the attempt to do so cost one live API call. See the
      2026-07-28 dotenv entry in `lessons-learned.md`.
- [x] Task: Run the benchmark and record results
    - [x] Run against the default model over the full golden set
    - [x] Write `benchmark-results.md` into this track directory
    - [x] Recorded findings: BATCH_PROMPT had no title/year rule (title 0/46 → 97.9% once ported); temperature was never set; `title` remains the weakest field at 91.7%

## Phase 6: Verify, Document & Close

- [x] Task: Run the release gates
    - [x] `CI=true npx vitest run server/src tests` → **exit 0**, 312 files passed / 1 skipped,
      2710 passed / 14 skipped, 0 failures
    - [x] `npx tsc -p server/tsconfig.json --noEmit` → exit 0, 0 diagnostics
    - [x] Coverage: `ReleaseParserProvider.ts` **100%** stmt/branch/func/line;
      `ReleaseParser.ts` 92.92% stmt / **80.95% branch** / 90.32% func / 95.83% line
    - Gate hazard worth keeping: an earlier "green" reading of this same suite was wrong twice.
      Once because the run was filtered through a pipeline whose trailing `head` supplied the
      exit code instead of vitest, and the filter regex hid the summary line; once because
      `pkill -f "vitest run server/src tests"` matched the `bash -c` wrapper but **not** the
      workers (`node …/vitest.mjs run …`), so a supposedly-dead suite kept running and a second
      full suite started on top of it — 13 failures, all in real-SQLite integration tests, all
      passing in isolation. **Capture vitest's own `$?`, and verify the process tree is empty
      before trusting a re-run.**
- [x] Task: Update project memory
    - [x] `tech-debt.md`: `ReleaseParserProvider` marked covered in the service row (8 → 7),
      closure evidence corrected to 73 tests / 100% branch; rows added for the unrotated key,
      the router cost/latency variance, the `regexFallback` season-range defect, and measured
      accuracy. (The `openrouter/auto` fallback row was **not** added — Phase 5b replaced the
      pin with `openrouter/pareto-code`, so the router row carries that guidance instead.)
    - [x] `lessons-learned.md`: timeout-vs-latency and positional-zip hazards recorded; plus the
      `env -u` vs `dotenv/config` lesson from the benchmark subagent's live API call
    - [x] `chore_remaining_server_service_coverage_20260728`: scope note added to its `plan.md`
      and its `tracks.md` entry so it does not re-plan a service this track closed
- [x] Task: Archive the track
    - [x] Set `metadata.json` `status: done` + `completed`
    - [x] Move to `measure/archive/`, update `tracks.md`
