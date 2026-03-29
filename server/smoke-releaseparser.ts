/**
 * Smoke test for ReleaseParser — real API calls.
 *
 * Run with the API key set:
 *   OPENROUTER_API_KEY=<key> bun smoke-releaseparser.ts
 */

import { releaseParser } from './src/services/ReleaseParser';
import type { SearchContext } from './src/services/ReleaseParser';

const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';

function ok(label: string, value: unknown) {
  console.log(`  ${GREEN}✓${RESET} ${label}: ${CYAN}${JSON.stringify(value)}${RESET}`);
}

function fail(label: string, got: unknown, expected: string) {
  console.log(`  ${RED}✗${RESET} ${label}: got ${JSON.stringify(got)}, expected ${expected}`);
}

function header(title: string) {
  console.log(`\n${YELLOW}━━ ${title} ━━${RESET}`);
}

// ── parse() test cases ────────────────────────────────────────────────────────

header('parse() — single title');

const parseCases: Array<{ input: string; expectMatchType: string; expectSeason?: number; expectYear?: number; expectType?: string }> = [
  { input: 'Breaking.Bad.S03E05.Mas.1080p.BluRay.x264-ROVERS.mkv', expectMatchType: 'episode', expectSeason: 3 },
  { input: 'Archer.2009.S10E04.Dining.with.the.Zarglorp.720p.WEB-DL.mkv', expectMatchType: 'episode', expectYear: 2009 },
  { input: 'The.Big.Bang.Theory.S02.1080p.BluRay.x264', expectMatchType: 'season_pack', expectSeason: 2 },
  { input: 'The.Wire.Complete.Series.BluRay.1080p.x265', expectMatchType: 'complete_series' },
  { input: 'Oppenheimer.2023.2160p.UHD.BluRay.REMUX.HEVC.TrueHD.Atmos-FGT.mkv', expectMatchType: 'complete_series', expectType: 'movie' },
  { input: 'Game of Thrones - 08x06 - The Iron Throne [1080p].mkv', expectMatchType: 'episode', expectSeason: 8 },
];

for (const { input, expectMatchType, expectSeason, expectYear, expectType } of parseCases) {
  console.log(`\n  Input: "${input}"`);
  const result = await releaseParser.parse(input);
  if (!result) {
    fail('result', null, 'non-null ParsedRelease');
    continue;
  }
  if (result.matchType === expectMatchType) {
    ok('matchType', result.matchType);
  } else {
    fail('matchType', result.matchType, expectMatchType);
  }
  if (expectSeason !== undefined) {
    if (result.seasonNumber === expectSeason) ok('seasonNumber', result.seasonNumber);
    else fail('seasonNumber', result.seasonNumber, String(expectSeason));
  }
  if (expectYear !== undefined) {
    if (result.year === expectYear) ok('year', result.year);
    else fail('year', result.year, String(expectYear));
  }
  if (expectType !== undefined) {
    if (result.type === expectType) ok('type', result.type);
    else fail('type', result.type, expectType);
  }
  console.log(`    title="${result.title}" quality=${JSON.stringify(result.quality)}`);
}

// ── parseBatch() TV test ──────────────────────────────────────────────────────

header('parseBatch() — TV season context (TBBT Season 2 / 1080p)');

const tvTitles = [
  'The.Big.Bang.Theory.S02.1080p.BluRay.x264-ROVERS',
  'The.Big.Bang.Theory.Complete.Series.1080p.BluRay.x265',
  'The.Big.Bang.Theory.S01.1080p.BluRay.x264',
  'The.Big.Bang.Theory.S02E01.The.Bad.Fish.Paradigm.1080p.BluRay.x264',
];

const tvContext: SearchContext = { seriesTitle: 'The Big Bang Theory', seasonNumber: 2, preferredResolution: '1080p' };
const tvResults = await releaseParser.parseBatch(tvTitles, tvContext);

console.log('\n  Results (title → matchType, relevanceScore):');
for (let i = 0; i < tvTitles.length; i++) {
  const r = tvResults[i];
  if (r) {
    console.log(`  ${i + 1}. ${r.matchType.padEnd(16)} score=${r.relevanceScore.toString().padStart(3)}  "${tvTitles[i]}"`);
  } else {
    console.log(`  ${i + 1}. ${RED}missing${RESET}  "${tvTitles[i]}"`);
  }
}

// Verify S02 pack beats complete series
const s02Pack = tvResults[0];
const completeSeries = tvResults[1];
if (s02Pack && completeSeries) {
  if (s02Pack.relevanceScore > completeSeries.relevanceScore) {
    ok('S02 pack scores higher than complete series', `${s02Pack.relevanceScore} > ${completeSeries.relevanceScore}`);
  } else {
    fail('S02 pack vs complete series ordering', `${s02Pack.relevanceScore} <= ${completeSeries.relevanceScore}`, 'S02 pack > complete series');
  }
}

// ── parseBatch() movie test ───────────────────────────────────────────────────

header('parseBatch() — movie context (Oppenheimer / 2160p)');

const movieTitles = [
  'Oppenheimer.2023.2160p.UHD.BluRay.REMUX.HEVC.TrueHD.Atmos-FGT',
  'Oppenheimer.2023.1080p.BluRay.x264-YTS',
  'The.Oppenheimer.Project.2023.Documentary.1080p.WEB-DL',
];

const movieContext: SearchContext = { movieTitle: 'Oppenheimer', preferredResolution: '2160p' };
const movieResults = await releaseParser.parseBatch(movieTitles, movieContext);

console.log('\n  Results:');
for (let i = 0; i < movieTitles.length; i++) {
  const r = movieResults[i];
  if (r) {
    console.log(`  ${i + 1}. type=${r.type.padEnd(7)} matchType=${r.matchType.padEnd(16)} score=${r.relevanceScore.toString().padStart(3)}  resolution=${r.quality?.resolution ?? 'null'}`);
  } else {
    console.log(`  ${i + 1}. ${RED}missing${RESET}`);
  }
}

const uhd = movieResults[0];
if (uhd) {
  if (uhd.quality?.resolution === 'unknown') {
    ok('4K UHD resolution tagged as "unknown"', uhd.quality.resolution);
  } else {
    fail('4K UHD resolution', uhd.quality?.resolution, '"unknown"');
  }
  if (uhd.type === 'movie') {
    ok('UHD release is type=movie', uhd.type);
  } else {
    fail('UHD release type', uhd.type, '"movie"');
  }
}

console.log('\n');
