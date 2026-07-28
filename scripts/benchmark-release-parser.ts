// Env-gated live accuracy benchmark for the AI release parser.
//
// This makes PAID LIVE API CALLS against whatever provider `ReleaseParserProvider`
// resolves (OpenRouter or an OpenAI-compatible gateway). It must never run as a side
// effect of `vitest run`, `npm test`, or CI — it is gated behind
// `RELEASE_PARSER_BENCHMARK=true` and exits 0 immediately otherwise.
//
// Usage:
//   RELEASE_PARSER_BENCHMARK=true npx tsx scripts/benchmark-release-parser.ts \
//     [--model <openrouter-model-id>] [--batch-size <n>] [--runs <n>] [--limit <n>] [--out <file>]
//
// The imports below are dynamic on purpose. Files under scripts/ resolve against the
// root tsconfig (`module: nodenext`) while server/ uses `module: preserve`, and a
// static named import across that boundary collapses to a default-only CJS namespace —
// it then fails at load time with "does not provide an export named …". This already
// broke scripts/reconcile-migration-compatibility.ts in production (tech-debt,
// 2026-07-27); see that file for the same pattern. Type-only imports are erased at
// compile time and never touch the runtime module boundary, so they are safe to import
// statically.
import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import type { GoldenEntry } from '../server/src/services/__fixtures__/releaseParserGolden.js';
import type { BatchParseSlot, ParsedRelease } from '../server/src/services/ReleaseParser.js';

// ── Env gate ─────────────────────────────────────────────────────────────────

if (process.env.RELEASE_PARSER_BENCHMARK !== 'true') {
  console.log('[benchmark-release-parser] Skipped: this benchmark makes paid live API calls.');
  console.log('[benchmark-release-parser] Enable it explicitly with:');
  console.log(
    '  RELEASE_PARSER_BENCHMARK=true npx tsx scripts/benchmark-release-parser.ts ' +
      '[--model <id>] [--batch-size <n>] [--runs <n>] [--limit <n>] [--out <file>]',
  );
  process.exit(0);
}

// ── CLI flags ────────────────────────────────────────────────────────────────

interface CliArgs {
  model?: string | undefined;
  batchSize: number;
  runs: number;
  limit?: number | undefined;
  out?: string | undefined;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { batchSize: 8, runs: 1 };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    switch (flag) {
      case '--model':
        args.model = argv[++i];
        break;
      case '--batch-size': {
        const value = Number(argv[++i]);
        if (Number.isFinite(value) && value > 0) args.batchSize = Math.floor(value);
        break;
      }
      case '--runs': {
        const value = Number(argv[++i]);
        if (Number.isFinite(value) && value > 0) args.runs = Math.floor(value);
        break;
      }
      case '--limit': {
        const value = Number(argv[++i]);
        if (Number.isFinite(value) && value > 0) args.limit = Math.floor(value);
        break;
      }
      case '--out':
        args.out = argv[++i];
        break;
      default:
        break;
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

// `--model` overrides OPENROUTER_MODEL before the AI config is resolved, so different
// arms can be compared in separate invocations without editing .env.
if (args.model) {
  process.env.OPENROUTER_MODEL = args.model;
}

// ── Dynamic imports of server/ runtime code (see module-boundary note above) ──

const { releaseParser } = await import('../server/src/services/ReleaseParser.js');
const { resolveReleaseParserAiConfig } = await import(
  '../server/src/services/ReleaseParserProvider.js'
);
const { RELEASE_PARSER_GOLDEN } = await import(
  '../server/src/services/__fixtures__/releaseParserGolden.js'
);

// ── Comparison helpers ───────────────────────────────────────────────────────

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, ' ');
}

function arraysEqual(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function resolutionOf(quality: ParsedRelease['quality']): string | null {
  return quality?.resolution ?? null;
}

interface FieldTally {
  matches: number;
  attempted: number;
}

function newTally(): FieldTally {
  return { matches: 0, attempted: 0 };
}

interface FieldTallies {
  titleExact: FieldTally;
  titleNormalized: FieldTally;
  year: FieldTally;
  seasonNumber: FieldTally;
  episodeNumbers: FieldTally;
  matchType: FieldTally;
  type: FieldTally;
  qualityResolution: FieldTally;
}

function newFieldTallies(): FieldTallies {
  return {
    titleExact: newTally(),
    titleNormalized: newTally(),
    year: newTally(),
    seasonNumber: newTally(),
    episodeNumbers: newTally(),
    matchType: newTally(),
    type: newTally(),
    qualityResolution: newTally(),
  };
}

function scoreSlot(expected: ParsedRelease, actual: ParsedRelease, tallies: FieldTallies): void {
  tallies.titleExact.attempted++;
  if (expected.title === actual.title) tallies.titleExact.matches++;

  tallies.titleNormalized.attempted++;
  if (normalizeTitle(expected.title) === normalizeTitle(actual.title)) {
    tallies.titleNormalized.matches++;
  }

  tallies.year.attempted++;
  if (expected.year === actual.year) tallies.year.matches++;

  tallies.seasonNumber.attempted++;
  if (expected.seasonNumber === actual.seasonNumber) tallies.seasonNumber.matches++;

  tallies.episodeNumbers.attempted++;
  if (arraysEqual(expected.episodeNumbers, actual.episodeNumbers)) tallies.episodeNumbers.matches++;

  tallies.matchType.attempted++;
  if (expected.matchType === actual.matchType) tallies.matchType.matches++;

  tallies.type.attempted++;
  if (expected.type === actual.type) tallies.type.matches++;

  tallies.qualityResolution.attempted++;
  if (resolutionOf(expected.quality) === resolutionOf(actual.quality)) {
    tallies.qualityResolution.matches++;
  }
}

function pct(tally: FieldTally): string {
  if (tally.attempted === 0) return 'n/a (0 attempted)';
  return `${((tally.matches / tally.attempted) * 100).toFixed(1)}% (${tally.matches}/${tally.attempted})`;
}

function stats(values: readonly number[]): { min: number; median: number; max: number } {
  if (values.length === 0) return { min: 0, median: 0, max: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0]!;
  const max = sorted[sorted.length - 1]!;
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
  return { min, median, max };
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let offset = 0; offset < items.length; offset += size) {
    chunks.push(items.slice(offset, offset + size));
  }
  return chunks;
}

// ── Provider gate ────────────────────────────────────────────────────────────

const aiConfig = resolveReleaseParserAiConfig();
if (!aiConfig.enabled) {
  console.error('[benchmark-release-parser] No AI provider is configured.');
  console.error(`[benchmark-release-parser] resolveReleaseParserAiConfig(): ${aiConfig.description}`);
  console.error(
    '[benchmark-release-parser] Refusing to silently benchmark the regex fallback — set ' +
      'OPENROUTER_API_KEY (or AI_GATEWAY_BASE_URL + AI_GATEWAY_MODEL) and retry.',
  );
  process.exit(1);
}

console.warn('');
console.warn('==================================================================');
console.warn('  WARNING: this benchmark makes PAID LIVE API CALLS against a real');
console.warn(`  provider — ${aiConfig.description}`);
console.warn('==================================================================');
console.warn('');

// ── Run the benchmark ────────────────────────────────────────────────────────

const golden: readonly GoldenEntry[] = args.limit
  ? RELEASE_PARSER_GOLDEN.slice(0, args.limit)
  : RELEASE_PARSER_GOLDEN;

const batches = chunk(golden, args.batchSize);

interface BatchRecord {
  run: number;
  batchIndex: number;
  titleCount: number;
  nonNullCount: number;
  durationMs: number;
  returnedAnything: boolean;
}

const batchRecords: BatchRecord[] = [];
const fieldTallies = newFieldTallies();
let skippedSlots = 0;
let totalSlots = 0;

console.log(
  `[benchmark-release-parser] model=${aiConfig.modelId ?? '(unresolved)'} source=${aiConfig.source} ` +
    `golden-entries=${golden.length} batch-size=${args.batchSize} runs=${args.runs}`,
);

for (let run = 1; run <= args.runs; run++) {
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batchEntries = batches[batchIndex]!;
    const titles = batchEntries.map(entry => entry.title);

    const startedAt = performance.now();
    const slots: BatchParseSlot[] = await releaseParser.parseBatch(titles);
    const durationMs = performance.now() - startedAt;

    const nonNullCount = slots.filter(slot => slot !== null).length;
    batchRecords.push({
      run,
      batchIndex,
      titleCount: titles.length,
      nonNullCount,
      durationMs,
      returnedAnything: nonNullCount > 0,
    });

    console.log(
      `  run ${run}/${args.runs} batch ${batchIndex + 1}/${batches.length}: ` +
        `${nonNullCount}/${titles.length} aligned in ${durationMs.toFixed(0)}ms`,
    );

    for (let i = 0; i < batchEntries.length; i++) {
      totalSlots++;
      const slot = slots[i];
      if (!slot) {
        skippedSlots++;
        continue;
      }
      scoreSlot(batchEntries[i]!.expected, slot, fieldTallies);
    }
  }
}

// ── Report ───────────────────────────────────────────────────────────────────

const durations = batchRecords.map(record => record.durationMs);
const latency = stats(durations);
const totalNonNull = batchRecords.reduce((sum, record) => sum + record.nonNullCount, 0);
const totalTitles = batchRecords.reduce((sum, record) => sum + record.titleCount, 0);
const allNullBatches = batchRecords.filter(record => !record.returnedAnything).length;

const lines: string[] = [];
lines.push('# Release Parser Live Accuracy Benchmark');
lines.push('');
lines.push(`- Model: \`${aiConfig.modelId ?? '(unresolved)'}\``);
lines.push(`- Provider source: \`${aiConfig.source}\` — ${aiConfig.description}`);
lines.push(`- Golden entries: ${golden.length}${args.limit ? ` (limited from ${RELEASE_PARSER_GOLDEN.length})` : ''}`);
lines.push(`- Batch size: ${args.batchSize}`);
lines.push(`- Runs: ${args.runs}`);
lines.push(`- Batches executed: ${batchRecords.length}`);
lines.push('');

lines.push('## Alignment (truncation metric)');
lines.push('');
lines.push(`- Overall: ${totalNonNull}/${totalTitles} slots aligned (${((totalNonNull / totalTitles) * 100).toFixed(1)}%)`);
lines.push(`- Batches that returned nothing at all (all-null slots): ${allNullBatches}/${batchRecords.length}`);
lines.push(`- Skipped/unattributed slots (excluded from field accuracy below): ${skippedSlots}/${totalSlots}`);
lines.push('');
lines.push('| run | batch | nonNull/total | duration (ms) |');
lines.push('|-----|-------|---------------|----------------|');
for (const record of batchRecords) {
  lines.push(
    `| ${record.run} | ${record.batchIndex + 1} | ${record.nonNullCount}/${record.titleCount} | ${record.durationMs.toFixed(0)} |`,
  );
}
lines.push('');

lines.push('## Per-field accuracy');
lines.push('');
lines.push('Computed only over non-null (attempted) slots. A null slot is a skip, not a');
lines.push('mismatch — it is never counted against any field below. `null === null` counts as');
lines.push('a match for nullable fields (year, seasonNumber, quality.resolution).');
lines.push('');
lines.push('| field | accuracy |');
lines.push('|-------|----------|');
lines.push(`| title (exact) | ${pct(fieldTallies.titleExact)} |`);
lines.push(`| title (normalised: case-insensitive, trimmed, collapsed whitespace) | ${pct(fieldTallies.titleNormalized)} |`);
lines.push(`| year | ${pct(fieldTallies.year)} |`);
lines.push(`| seasonNumber | ${pct(fieldTallies.seasonNumber)} |`);
lines.push(`| episodeNumbers (array equality by value + order) | ${pct(fieldTallies.episodeNumbers)} |`);
lines.push(`| matchType | ${pct(fieldTallies.matchType)} |`);
lines.push(`| type | ${pct(fieldTallies.type)} |`);
lines.push(`| quality.resolution | ${pct(fieldTallies.qualityResolution)} |`);
lines.push('');

lines.push('## Latency');
lines.push('');
lines.push(`- min: ${latency.min.toFixed(0)}ms`);
lines.push(`- median: ${latency.median.toFixed(0)}ms`);
lines.push(`- max: ${latency.max.toFixed(0)}ms`);
lines.push(`- total wall clock: ${durations.reduce((sum, value) => sum + value, 0).toFixed(0)}ms across ${durations.length} batch call(s)`);
lines.push('');

lines.push('## Cost / token usage');
lines.push('');
lines.push(
  '`releaseParser.parseBatch()` does not surface `generateText`\'s `usage` object — it ' +
    'returns only the parsed, index-attributed slots. Reimplementing parseBatch here to ' +
    'extract usage would benchmark different code than production runs, so that was not ' +
    'done. Token usage: **not available through parseBatch.** Cost: **omitted** — without ' +
    'real token counts for this run, any $/1M-token estimate would be fabricated. See the ' +
    'informational latency/cost table pinned in server/src/services/ReleaseParserProvider.ts ' +
    '(measured 2026-07-28, 3 runs, 8 titles/call) for a prior, separately-measured reference ' +
    'point — it is not reproduced by this run and should not be treated as this run\'s cost.',
);
lines.push('');

lines.push('## What this does not measure');
lines.push('');
lines.push('- `relevanceScore` accuracy — the golden fixture has no relevance oracle, only');
lines.push('  parse-field expectations.');
lines.push('- `releaseParser.parse()` (single-title) or `releaseParser.parseFiles()` — this');
lines.push('  benchmark only exercises `parseBatch()`.');
lines.push('- Token usage or true dollar cost for this specific run (see Cost section above).');
lines.push('- Behaviour under the production concurrency bound (`RELEASE_PARSER_MAX_CONCURRENCY`)');
lines.push('  or the retry/backoff path in `parse()` — `parseBatch()` makes one call with no retry.');
lines.push('- Provider-side rate limiting or degradation under sustained concurrent load.');
lines.push('- Accuracy on titles outside the 48-entry golden fixture (real-world release');
lines.push('  naming is far more varied).');
lines.push('- Variance across different search contexts — this run calls `parseBatch()` with no');
lines.push('  `SearchContext`, so context-dependent relevance scoring is untested here.');
lines.push('');

const report = lines.join('\n');
console.log('');
console.log(report);

if (args.out) {
  writeFileSync(args.out, report, 'utf8');
  console.log(`[benchmark-release-parser] Report written to ${args.out}`);
}
