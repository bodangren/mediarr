import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaSearchService } from './MediaSearchService';
import { releaseParser, assignBatchSlots, type IndexedParsedRelease } from './ReleaseParser';

// ─── Regression: AI batch-parse alignment must survive a truncated response ───
//
// Background: MediaSearchService.searchAllIndexers() collects releases, filters
// to seeders > 2, sorts by seeders desc, takes the top 25, and calls
// releaseParser.parseBatch(titles, context). It used to zip results onto those
// releases by array POSITION. If the model returned fewer results than titles
// (truncation was reproduced live: 7-of-8 and 6-of-8 on two real models), every
// result after the gap silently shifted onto the WRONG release. Because
// parsedRelease.relevanceScore is consumed directly as confidenceScore by
// CustomFormatScoringEngine.scoreCandidateUnified(), and RssMediaMonitor /
// WantedSearchService auto-grab at totalScore >= 50, that mis-attribution could
// trigger an automatic download of the wrong release.
//
// parseBatch now returns exactly titles.length slots, each attributed by an
// echoed 1-based `index` field via assignBatchSlots() (see ReleaseParser.ts).
// These tests drive searchAllIndexers() end-to-end with a real (unmocked)
// assignBatchSlots fed a hand-built, deliberately truncated model response, and
// assert every release ends up with its OWN parse or none at all — never a
// neighbour's.

// This file spies on the releaseParser singleton's parseBatch method directly
// rather than mocking the whole './ReleaseParser' module, so that
// assignBatchSlots (the function actually under test here) stays real.

function makeIndexerRecord(id: number, name: string, priority = 1) {
  return {
    id,
    name,
    implementation: 'Cardigann',
    protocol: 'torrent',
    enabled: true,
    priority,
    supportsRss: true,
    supportsSearch: true,
    settings: {},
  };
}

function makeIndexerResult(overrides: Partial<{
  title: string;
  guid: string;
  seeders: number;
  size: bigint;
  magnetUrl: string;
  publishDate: Date;
  categories: number[];
  protocol: string;
}> = {}) {
  return {
    title: 'Show.S01E01.1080p.WEB-DL',
    guid: 'guid-1',
    publishDate: new Date('2026-03-01T00:00:00.000Z'),
    size: BigInt(1_000_000_000),
    seeders: 10,
    categories: [5000],
    protocol: 'torrent',
    magnetUrl: 'magnet:?xt=urn:btih:aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111',
    ...overrides,
  };
}

function makeService() {
  const indexerRepository = {
    findAllEnabled: vi.fn().mockResolvedValue([makeIndexerRecord(1, 'TestIndexer')]),
  };
  const indexerFactory = { fromDatabaseRecord: vi.fn() };
  const torrentManager = { addTorrent: vi.fn() };
  const activityEventEmitter = { emit: vi.fn().mockResolvedValue(undefined) };
  const customFormatRepository = { findByQualityProfileId: vi.fn().mockResolvedValue([]) };

  const service = new MediaSearchService(
    indexerRepository as any,
    indexerFactory as any,
    torrentManager as any,
    activityEventEmitter as any,
    customFormatRepository as any,
  );

  return { service, indexerRepository, indexerFactory };
}

/** Distinct 40-hex-char infoHash per release so dedup never collapses them. */
function hashFor(n: number): string {
  return n.toString(16).padStart(2, '0').repeat(20);
}

/** Own, unmistakable "parsed title" for a release — lets us assert a release
 * only ever carries a parse produced for its OWN title. */
function ownParseTitleFor(releaseTitle: string): string {
  return `PARSED::${releaseTitle}`;
}

function makeIndexedResult(
  title: string,
  index: number,
): IndexedParsedRelease {
  return {
    title: ownParseTitleFor(title),
    type: 'series',
    matchType: 'episode',
    seasonNumber: 1,
    episodeNumbers: [1],
    year: null,
    quality: null,
    relevanceScore: 90,
    index,
  };
}

// Eight batch-eligible releases (seeders > 2), constructed with strictly
// descending seeders so their post-sort order in searchAllIndexers matches
// this array's order exactly — that lets the mocked parseBatch below build a
// realistic per-title response without guessing at internal sort behaviour.
const BATCH_TITLES = [
  'Alpha.Show.S01E01.1080p.WEB-DL',
  'Bravo.Show.S01E01.1080p.WEB-DL',
  'Charlie.Show.S01E01.1080p.WEB-DL',
  'Delta.Show.S01E01.1080p.WEB-DL',
  'Echo.Show.S01E01.1080p.WEB-DL',
  'Foxtrot.Show.S01E01.1080p.WEB-DL',
  'Golf.Show.S01E01.1080p.WEB-DL',
  'Hotel.Show.S01E01.1080p.WEB-DL',
];

// The title whose model result is dropped to simulate truncation. Deliberately
// NOT the last title in the array — see the discrimination note in the report.
const OMITTED_TITLE = 'Delta.Show.S01E01.1080p.WEB-DL';

function makeBatchEligibleIndexerResults() {
  return BATCH_TITLES.map((title, i) =>
    makeIndexerResult({
      title,
      guid: `guid-batch-${i}`,
      seeders: 100 - i * 10, // 100, 90, 80, ... 30 — strictly descending
      magnetUrl: `magnet:?xt=urn:btih:${hashFor(i + 1)}`,
    }),
  );
}

function makeLowSeederIndexerResults() {
  return [
    makeIndexerResult({
      title: 'India.Show.S01E01.1080p.WEB-DL',
      guid: 'guid-low-1',
      seeders: 2, // excluded: seeders > 2 is required
      magnetUrl: `magnet:?xt=urn:btih:${hashFor(101)}`,
    }),
    makeIndexerResult({
      title: 'Juliet.Show.S01E01.1080p.WEB-DL',
      guid: 'guid-low-2',
      seeders: 1,
      magnetUrl: `magnet:?xt=urn:btih:${hashFor(102)}`,
    }),
  ];
}

/**
 * Builds a parseBatch mock that simulates a truncated model response: every
 * input title gets a correctly-indexed result EXCEPT `omittedTitle`, which the
 * model silently drops (as real truncation does). The response is then run
 * through the real, unmocked `assignBatchSlots` — exactly what
 * releaseParser.parseBatch does in production — so this test exercises the
 * actual attribution algorithm, not a hand-rolled stand-in for it.
 */
function mockTruncatedBatchResponse(omittedTitle: string) {
  return vi.spyOn(releaseParser, 'parseBatch').mockImplementation(async (titles: string[]) => {
    const results: IndexedParsedRelease[] = titles
      .map((title, i) => ({ title, index: i + 1 }))
      .filter(entry => entry.title !== omittedTitle)
      .map(entry => makeIndexedResult(entry.title, entry.index));

    return assignBatchSlots(titles.length, results);
  });
}

describe('MediaSearchService — AI batch-parse alignment survives truncation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('gives every batch-eligible release its OWN parse, and gives the release dropped by a truncated response NO parse at all', async () => {
    mockTruncatedBatchResponse(OMITTED_TITLE);

    const { service, indexerFactory } = makeService();
    const indexer = {
      search: vi.fn().mockResolvedValue([
        ...makeBatchEligibleIndexerResults(),
        ...makeLowSeederIndexerResults(),
      ]),
    };
    indexerFactory.fromDatabaseRecord.mockReturnValue(indexer);

    const result = await service.searchAllIndexers({ query: 'test', type: 'tvsearch', title: 'Test Show' });

    for (const title of BATCH_TITLES) {
      const release = result.releases.find(r => r.title === title);
      expect(release).toBeDefined();

      if (title === OMITTED_TITLE) {
        // The truncated slot must stay empty — never inherit a neighbour's parse.
        expect(release!.parsedRelease).toBeUndefined();
      } else {
        // Every other release must carry EXACTLY its own parse, tied by title.
        expect(release!.parsedRelease?.title).toBe(ownParseTitleFor(title));
      }
    }
  });

  it('still scores (and returns) a release that received no parse, via the Levenshtein fallback rather than dropping it', async () => {
    mockTruncatedBatchResponse(OMITTED_TITLE);

    const { service, indexerFactory } = makeService();
    const indexer = {
      search: vi.fn().mockResolvedValue(makeBatchEligibleIndexerResults()),
    };
    indexerFactory.fromDatabaseRecord.mockReturnValue(indexer);

    const result = await service.searchAllIndexers({ query: 'test', type: 'tvsearch', title: 'Test Show' });

    const droppedRelease = result.releases.find(r => r.title === OMITTED_TITLE);
    expect(droppedRelease).toBeDefined();
    expect(droppedRelease!.parsedRelease).toBeUndefined();
    // It went through applyUnifiedScoring (Levenshtein path, since parsedRelease
    // is undefined) rather than being skipped — a real numeric score is present.
    expect(typeof droppedRelease!.customFormatScore).toBe('number');
    expect(droppedRelease!.scoringBreakdown?.confidenceScore).toBeGreaterThanOrEqual(0);
  });

  it('never attaches a batch parse to a release with seeders <= 2 (excluded from the batch)', async () => {
    mockTruncatedBatchResponse(OMITTED_TITLE);

    const { service, indexerFactory } = makeService();
    const indexer = {
      search: vi.fn().mockResolvedValue([
        ...makeBatchEligibleIndexerResults(),
        ...makeLowSeederIndexerResults(),
      ]),
    };
    indexerFactory.fromDatabaseRecord.mockReturnValue(indexer);

    const result = await service.searchAllIndexers({ query: 'test', type: 'tvsearch', title: 'Test Show' });

    const lowSeederTitles = ['India.Show.S01E01.1080p.WEB-DL', 'Juliet.Show.S01E01.1080p.WEB-DL'];
    for (const title of lowSeederTitles) {
      const release = result.releases.find(r => r.title === title);
      expect(release).toBeDefined();
      expect(release!.parsedRelease).toBeUndefined();
    }

    // Confirm they truly never reached parseBatch: only the 8 batch-eligible
    // titles (seeders > 2) should have been sent.
    expect(releaseParser.parseBatch).toHaveBeenCalledTimes(1);
    const sentTitles = vi.mocked(releaseParser.parseBatch).mock.calls[0]![0];
    expect(sentTitles).toHaveLength(8);
    expect(sentTitles).not.toContain('India.Show.S01E01.1080p.WEB-DL');
    expect(sentTitles).not.toContain('Juliet.Show.S01E01.1080p.WEB-DL');
  });

  it('completes the search and returns all releases unparsed if parseBatch throws', async () => {
    vi.spyOn(releaseParser, 'parseBatch').mockRejectedValue(new Error('AI provider unavailable'));

    const { service, indexerFactory } = makeService();
    const indexer = {
      search: vi.fn().mockResolvedValue([
        ...makeBatchEligibleIndexerResults(),
        ...makeLowSeederIndexerResults(),
      ]),
    };
    indexerFactory.fromDatabaseRecord.mockReturnValue(indexer);

    const result = await service.searchAllIndexers({ query: 'test', type: 'tvsearch', title: 'Test Show' });

    expect(result.releases).toHaveLength(BATCH_TITLES.length + 2);
    for (const release of result.releases) {
      expect(release.parsedRelease).toBeUndefined();
      expect(typeof release.customFormatScore).toBe('number');
    }
  });
});
