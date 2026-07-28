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

- [ ] Task: Build the golden release-title set
    - [ ] Create `server/src/services/__fixtures__/releaseParserGolden.ts` with ≥40 real titles
    - [ ] Cover: single episode, multi-episode `S01E01E02`, `NNxNN`, season pack, complete series, movie, anime absolute numbering, `Archer.2009` vs `Oppenheimer.2023`, 2160p/UHD → `resolution: "unknown"`, `BluRay.REMUX` → `source: "REMUX"`
    - [ ] Each entry: `{ title, expected: ParsedRelease, regexFallbackExpected: ParsedRelease | null, notes }`
    - [ ] Export a typed accessor; assert shape against `ParsedReleaseSchema` at module load
- [ ] Task: Define the indexed batch-response contract
    - [ ] Extend the batch item schema with a nullable 1-based `index` field
    - [ ] Update `BATCH_PROMPT` to require the echoed index on every result
    - [ ] Define the new `parseBatch()` return type: `(ParsedReleaseWithScore | null)[]`, length === `titles.length`
- [ ] Task: Define the parser runtime-configuration contract
    - [ ] Add a `ReleaseParserRuntimeConfig` type: `parseTimeoutMs`, `batchTimeoutMs`, `filesTimeoutMs`, `maxConcurrency`
    - [ ] Document defaults and the env vars that override them
    - [ ] Define the known-fast model allowlist used by the FR-3 startup warning

## Phase 2: Test (Red)

- [ ] Task: Red tests for batch alignment (FR-2)
    - [ ] Test: model returns 7 indexed results for 8 titles → each parse lands on its own title, slot 3 is `null`
    - [ ] Test: model returns 8 indexed results out of order → all 8 land correctly
    - [ ] Test: duplicate index → both discarded, no mis-attribution
    - [ ] Test: index out of range / non-integer → discarded
    - [ ] Test: no index on any result + length mismatch → whole batch rejected (`[]`-equivalent, all `null`)
    - [ ] Test: no index on any result + exact length match → positional zip still honoured
    - [ ] Test in `MediaSearchService.test.ts`: truncated batch never sets `parsedRelease` on the wrong release
    - [ ] Confirm all fail against current code
- [ ] Task: Red tests for configurable timeouts and model default (FR-3, FR-4)
    - [ ] Test: default resolved model is `google/gemini-2.5-flash-lite` with no `OPENROUTER_MODEL`
    - [ ] Test: `OPENROUTER_MODEL` override still wins
    - [ ] Test: each of the three deadlines is read from config, asserted via the `abortSignal` passed to `generateText`
    - [ ] Test: a model outside the known-fast allowlist emits the startup warning exactly once
    - [ ] Confirm all fail against current code
- [ ] Task: Golden-set regression tests for the regex fallback (FR-1)
    - [ ] Table-driven test asserting `regexFallback` against every `regexFallbackExpected` in the golden set
    - [ ] Runs with AI disabled — no mocks, no network
- [ ] Task: `ReleaseParserProvider` sibling test file (FR-6)
    - [ ] Create `server/src/services/ReleaseParserProvider.test.ts`
    - [ ] Cover gateway path, OpenRouter path, disabled path, and every env fallback (`AI_GATEWAY_MODEL` → `OPENROUTER_MODEL`; `AI_GATEWAY_API_KEY` → `API_SECRET_KEY` → `local-dev-key`)
    - [ ] Target ≥80% branch coverage

## Phase 3: Implement

- [ ] Task: Implement indexed batch alignment in `parseBatch()`
    - [ ] Build a `titles.length`-sized result array pre-filled with `null`
    - [ ] Place each result by its echoed index; discard missing/duplicate/out-of-range
    - [ ] Preserve the strict-length positional path for index-less responses
    - [ ] Turn Phase 2 alignment tests green
- [ ] Task: Update `MediaSearchService` for the nullable-slot contract
    - [ ] Replace the positional zip at `MediaSearchService.ts:580` with slot-wise assignment that skips `null`
    - [ ] Verify `applyUnifiedScoring` still falls back to Levenshtein when `parsedRelease` is absent
- [ ] Task: Implement configurable timeouts and the model warning
    - [ ] Replace the three `AbortSignal.timeout(...)` literals with config reads
    - [ ] Emit the known-fast-model warning from `resolveReleaseParserAiConfig()`
- [ ] Task: Pin the default model and update environment docs
    - [ ] `DEFAULT_OPENROUTER_MODEL` → `google/gemini-2.5-flash-lite`
    - [ ] Update `.env.example`: drop `openrouter/free` as a documented default, document `OPENROUTER_MODEL` and the timeout overrides
    - [ ] Note the measured latency/cost basis in a comment so the pin is traceable to evidence

## Phase 4: Bounded Concurrency (FR-7)

- [ ] Task: Red test for bounded concurrency
    - [ ] Test: 10 concurrent `parse()` calls issue at most 4 in-flight `generateText` calls
    - [ ] Test: each caller receives its own result, not another caller's
    - [ ] Test: one failing call still falls back to regex and does not poison siblings
- [ ] Task: Replace the serial queue with a bounded limiter
    - [ ] Swap the `this.queue` promise chain for a semaphore with configurable `maxConcurrency` (default 4)
    - [ ] Turn Phase 4 tests green
    - [ ] Re-run the full `ReleaseParser.test.ts` suite — the existing serial-ordering tests must be reconciled deliberately, not deleted

## Phase 5: Live Accuracy Benchmark (FR-5)

- [ ] Task: Build the env-gated benchmark script
    - [ ] Create `scripts/benchmark-release-parser.ts`, gated on `RELEASE_PARSER_BENCHMARK=true`
    - [ ] Use dynamic `import()` for anything under `server/` (tech-debt row 2026-07-27: static `scripts/` → `server/` imports break at runtime)
    - [ ] Report per-field accuracy, latency, token cost, JSON validity, alignment
    - [ ] Support `--model` so arms can be compared
    - [ ] Add an `npm run benchmark:parser` script
- [ ] Task: Run the benchmark and record results
    - [ ] Run against the pinned model over the full golden set
    - [ ] Write `benchmark-results.md` into this track directory
    - [ ] If accuracy is materially below the probe's implied expectation, record it as a finding — do not tune the prompt in this track (Out of Scope)

## Phase 6: Verify, Document & Close

- [ ] Task: Run the release gates
    - [ ] `CI=true npx vitest run server/src tests` → 0 failures
    - [ ] `npx tsc -p server/tsconfig.json --noEmit` → 0 diagnostics
    - [ ] Coverage check on `ReleaseParser.ts` and `ReleaseParserProvider.ts` (>80% branch)
- [ ] Task: Update project memory
    - [ ] `tech-debt.md`: mark `ReleaseParserProvider` covered in the 8-service row (8 → 7); add rows for the `openrouter/auto` fallback option and the unrotated key
    - [ ] `lessons-learned.md`: record the timeout-vs-latency lesson and the positional-zip hazard
    - [ ] `chore_remaining_server_service_coverage_20260728`: note that `ReleaseParserProvider` is claimed by this track
- [ ] Task: Archive the track
    - [ ] Set `metadata.json` `status: done` + `completed`
    - [ ] Move to `measure/archive/`, update `tracks.md`
