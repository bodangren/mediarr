# Release Parser Live Accuracy Benchmark

- Model: `google/gemini-2.5-flash-lite`
- Provider source: `openrouter` — OpenRouter using google/gemini-2.5-flash-lite
- Golden entries: 48
- Batch size: 8
- Runs: 1
- Batches executed: 6

## Alignment (truncation metric)

- Overall: 48/48 slots aligned (100.0%)
- Batches that returned nothing at all (all-null slots): 0/6
- Skipped/unattributed slots (excluded from field accuracy below): 0/48

| run | batch | nonNull/total | duration (ms) |
|-----|-------|---------------|----------------|
| 1 | 1 | 8/8 | 3781 |
| 1 | 2 | 8/8 | 2331 |
| 1 | 3 | 8/8 | 3663 |
| 1 | 4 | 8/8 | 1878 |
| 1 | 5 | 8/8 | 2353 |
| 1 | 6 | 8/8 | 2194 |

## Per-field accuracy

Computed only over non-null (attempted) slots. A null slot is a skip, not a
mismatch — it is never counted against any field below. `null === null` counts as
a match for nullable fields (year, seasonNumber, quality.resolution).

| field | accuracy |
|-------|----------|
| title (exact) | 97.9% (47/48) |
| title (normalised: case-insensitive, trimmed, collapsed whitespace) | 97.9% (47/48) |
| year | 85.4% (41/48) |
| seasonNumber | 100.0% (48/48) |
| episodeNumbers (array equality by value + order) | 100.0% (48/48) |
| matchType | 100.0% (48/48) |
| type | 100.0% (48/48) |
| quality.resolution | 95.8% (46/48) |

## Latency

- min: 1878ms
- median: 2342ms
- max: 3781ms
- total wall clock: 16200ms across 6 batch call(s)

## Cost / token usage

`releaseParser.parseBatch()` does not surface `generateText`'s `usage` object — it returns only the parsed, index-attributed slots. Reimplementing parseBatch here to extract usage would benchmark different code than production runs, so that was not done. Token usage: **not available through parseBatch.** Cost: **omitted** — without real token counts for this run, any $/1M-token estimate would be fabricated. See the informational latency/cost table pinned in server/src/services/ReleaseParserProvider.ts (measured 2026-07-28, 3 runs, 8 titles/call) for a prior, separately-measured reference point — it is not reproduced by this run and should not be treated as this run's cost.

## What this does not measure

- `relevanceScore` accuracy — the golden fixture has no relevance oracle, only
  parse-field expectations.
- `releaseParser.parse()` (single-title) or `releaseParser.parseFiles()` — this
  benchmark only exercises `parseBatch()`.
- Token usage or true dollar cost for this specific run (see Cost section above).
- Behaviour under the production concurrency bound (`RELEASE_PARSER_MAX_CONCURRENCY`)
  or the retry/backoff path in `parse()` — `parseBatch()` makes one call with no retry.
- Provider-side rate limiting or degradation under sustained concurrent load.
- Accuracy on titles outside the 48-entry golden fixture (real-world release
  naming is far more varied).
- Variance across different search contexts — this run calls `parseBatch()` with no
  `SearchContext`, so context-dependent relevance scoring is untested here.
