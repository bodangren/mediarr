/**
 * Smoke test for ReleaseParser — real DeepSeek calls, no disk/DB writes.
 * Run with: DEEPSEEK_API_KEY=<key> bun smoke-releaseparser.ts  (from server/)
 * Note: .env is in the project root; bun only loads .env from cwd, so pass the key explicitly.
 */

import { releaseParser } from './src/services/ReleaseParser';
import type { SearchContext } from './src/services/ReleaseParser';

// ── ANSI helpers ─────────────────────────────────────────────────────────────
const bold  = (s: string) => `\x1b[1m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const cyan  = (s: string) => `\x1b[36m${s}\x1b[0m`;
const dim   = (s: string) => `\x1b[2m${s}\x1b[0m`;
const red   = (s: string) => `\x1b[31m${s}\x1b[0m`;

function section(title: string) {
  console.log('\n' + bold('━'.repeat(60)));
  console.log(bold('  ' + title));
  console.log(bold('━'.repeat(60)));
}

// ── 1. Single-parse smoke — import filenames ─────────────────────────────────

const importFilenames = [
  // Standard episode
  'Breaking.Bad.S03E05.Mas.1080p.BluRay.x264-ROVERS.mkv',
  // Disambiguated title (year in name)
  'Archer.2009.S10E04.Dining.with.the.Zarglorp.720p.WEB-DL.mkv',
  // Season pack directory name
  'The.Big.Bang.Theory.S02.1080p.BluRay.x264',
  // Complete series
  'The.Wire.Complete.Series.BluRay.1080p.x265',
  // Movie
  'Oppenheimer.2023.2160p.UHD.BluRay.REMUX.HEVC.TrueHD.Atmos-FGT.mkv',
  // Non-standard naming (should still parse)
  'Game of Thrones - 08x06 - The Iron Throne [1080p].mkv',
];

section('1 · parse() — import filenames (serial queue)');

for (const filename of importFilenames) {
  process.stdout.write(dim('  ' + filename.substring(0, 55).padEnd(56)) + '  ');
  const result = await releaseParser.parse(filename);
  if (!result) {
    console.log(red('✗ null'));
  } else {
    const matchInfo = result.matchType === 'episode'
      ? `S${String(result.seasonNumber ?? '?').padStart(2,'0')}E${(result.episodeNumbers?.[0] ?? '?').toString().padStart(2,'0')}`
      : result.matchType === 'season_pack'
        ? `S${String(result.seasonNumber ?? '?').padStart(2,'0')} pack`
        : 'complete series';
    const quality = result.quality?.resolution ?? '?';
    console.log(green(`✓ [${result.type}/${result.matchType}]`) +
      `  ${cyan(result.title)}  ` +
      dim(`${matchInfo}  ${quality}`));
  }
}

// ── 2. parseBatch smoke — search results for "Big Bang Theory S02" ────────────

section('2 · parseBatch() — search results for "The Big Bang Theory S02 1080p"');

const searchTitles = [
  'The.Big.Bang.Theory.S02.Complete.1080p.BluRay.x264-DEMAND',
  'The.Big.Bang.Theory.S02E01.The.Bad.Fish.Paradigm.1080p.WEB-DL',
  'The.Big.Bang.Theory.S02E12.The.Buffalo.Consequences.720p.HDTV',
  'The.Big.Bang.Theory.Complete.Series.BluRay.1080p.x265',
  'The.Big.Bang.Theory.S01.Complete.1080p.BluRay.x264',
  'TBBT.S02.2160p.UHD.BluRay.HEVC-GROUP',
  'The.Big.Bang.Theory.S02E23-E24.The.Monopolar.Expedition.1080p',
  'Big Bang Theory Season 2 DVDRip XviD',
];

const context: SearchContext = {
  seriesTitle: 'The Big Bang Theory',
  seasonNumber: 2,
  preferredResolution: '1080p',
};

console.log(dim(`  Context: ${JSON.stringify(context)}`));
console.log('');

const batchResults = await releaseParser.parseBatch(searchTitles, context);

if (batchResults.length === 0) {
  console.log(red('  parseBatch returned [] — check API key or network'));
} else {
  // Sort by relevanceScore descending for display
  const withIndex = batchResults.map((r, i) => ({ ...r, original: searchTitles[i]! }));
  withIndex.sort((a, b) => b.relevanceScore - a.relevanceScore);

  console.log('  Score  matchType         Quality   Title');
  console.log(dim('  ' + '─'.repeat(70)));
  for (const r of withIndex) {
    const score = String(r.relevanceScore).padStart(3);
    const mt = r.matchType.padEnd(18);
    const res = (r.quality?.resolution ?? '?').padEnd(6);
    const seasonInfo = r.matchType === 'season_pack'
      ? `S${String(r.seasonNumber ?? '?').padStart(2,'0')}`
      : r.matchType === 'episode'
        ? `S${String(r.seasonNumber ?? '?').padStart(2,'0')}E${(r.episodeNumbers?.[0] ?? '?').toString().padStart(2,'0')}`
        : 'all';
    console.log(`  ${cyan(score)}  ${mt}  ${res}  [${seasonInfo}] ${dim(r.title)}`);
  }

  // Verify ordering expectation
  console.log('');
  const s2pack  = withIndex.find(r => r.matchType === 'season_pack' && r.seasonNumber === 2);
  const s1pack  = withIndex.find(r => r.matchType === 'season_pack' && r.seasonNumber === 1);
  const complete = withIndex.find(r => r.matchType === 'complete_series');
  const episode = withIndex.find(r => r.matchType === 'episode');

  const check = (label: string, pass: boolean) =>
    console.log(`  ${pass ? green('✓') : red('✗')} ${label}`);

  check(
    `S02 pack (score ${s2pack?.relevanceScore ?? 'n/a'}) > complete series (${complete?.relevanceScore ?? 'n/a'})`,
    (s2pack?.relevanceScore ?? 0) > (complete?.relevanceScore ?? 999),
  );
  check(
    `S02 pack (score ${s2pack?.relevanceScore ?? 'n/a'}) > S01 pack (${s1pack?.relevanceScore ?? 'n/a'})`,
    (s2pack?.relevanceScore ?? 0) > (s1pack?.relevanceScore ?? 999),
  );
  if (episode) {
    check(
      `S02 specific episode (score ${episode.relevanceScore}) ranked above complete series (${complete?.relevanceScore ?? 'n/a'})`,
      episode.relevanceScore > (complete?.relevanceScore ?? 999),
    );
  }
}

// ── 3. parseBatch — movie search ──────────────────────────────────────────────

section('3 · parseBatch() — movie search for "Oppenheimer 2023 4K"');

const movieTitles = [
  'Oppenheimer.2023.2160p.UHD.BluRay.REMUX.HEVC.TrueHD.Atmos-FGT',
  'Oppenheimer.2023.1080p.BluRay.x264-SPARKS',
  'Oppenheimer.2023.720p.WEB-DL.H264-EVO',
  'Oppenheimer.2023.2160p.AMZN.WEB-DL.DDP5.1.H265-GROUP',
  'J.Robert.Oppenheimer.A.Life.Documentary.2023.1080p',  // different movie
  'Oppenheimer.2023.HDR.2160p.BluRay.x265-TENBiT',
];

const movieContext: SearchContext = {
  movieTitle: 'Oppenheimer',
  preferredResolution: '2160p',
};

console.log(dim(`  Context: ${JSON.stringify(movieContext)}`));
console.log('');

const movieResults = await releaseParser.parseBatch(movieTitles, movieContext);

if (movieResults.length === 0) {
  console.log(red('  parseBatch returned []'));
} else {
  const withIdx = movieResults.map((r, i) => ({ ...r, original: movieTitles[i]! }));
  withIdx.sort((a, b) => b.relevanceScore - a.relevanceScore);

  console.log('  Score  type    Quality   Title');
  console.log(dim('  ' + '─'.repeat(60)));
  for (const r of withIdx) {
    const score = String(r.relevanceScore).padStart(3);
    const res   = (r.quality?.resolution ?? '?').padEnd(6);
    console.log(`  ${cyan(score)}  ${r.type.padEnd(7)} ${res}  ${dim(r.title)}`);
  }

  const topResult = withIdx[0];
  const check = (label: string, pass: boolean) =>
    console.log(`  ${pass ? green('✓') : red('✗')} ${label}`);

  console.log('');
  // 4K/UHD now maps to "unknown" per schema — top result should be "unknown" (highest-quality 4K release)
  check(
    `Top result resolution is "unknown" (4K/UHD — got: ${topResult?.quality?.resolution})`,
    topResult?.quality?.resolution === 'unknown',
  );
  const docResult = movieResults.find((_, i) => movieTitles[i]?.includes('Documentary'));
  check(
    `Documentary got lower score than actual movie (got: ${docResult?.relevanceScore ?? 'n/a'})`,
    (docResult?.relevanceScore ?? 0) < (topResult?.relevanceScore ?? 0),
  );
}

console.log('\n' + bold('━'.repeat(60)));
console.log(bold('  Done'));
console.log(bold('━'.repeat(60)) + '\n');
