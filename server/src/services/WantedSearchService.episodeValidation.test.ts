/**
 * Corner-case tests for WantedSearchService episode candidate validation.
 *
 * Core bug: autoSearchEpisode grabs whatever the highest-scored candidate is
 * without checking whether the release's episode number matches the requested
 * episode. Indexers frequently return slightly wrong results (e.g. S01E02 when
 * you asked for S01E01). These tests drive out a candidate filter that rejects
 * mismatched releases before selecting the best candidate.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WantedSearchService } from './WantedSearchService';
import type { MediaSearchService, SearchCandidate } from './MediaSearchService';
import type { ActivityEventEmitter } from './ActivityEventEmitter';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCandidate(title: string, score = 80): SearchCandidate {
  return {
    title,
    customFormatScore: score,
    size: 1_000_000_000,
    seeders: 10,
    indexerId: 1,
    guid: `guid-${title}`,
    magnetUrl: `magnet:?xt=urn:btih:${title.replace(/\s/g, '')}`,
  } as unknown as SearchCandidate;
}

function makeService() {
  const grabRelease = vi.fn().mockResolvedValue(undefined);
  const searchAllIndexers = vi.fn().mockResolvedValue({ releases: [] as SearchCandidate[] });
  const mediaSearchService = { searchAllIndexers, grabRelease } as unknown as MediaSearchService;

  const emit = vi.fn().mockResolvedValue(undefined);
  const activityEventEmitter = { emit } as unknown as ActivityEventEmitter;

  // Episode for S01E01 of "Breaking Bad"
  const episode = {
    id: 10,
    episodeNumber: 1,
    seasonNumber: 1,
    airDateUtc: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // aired 7 days ago
    path: null,
    season: {
      series: {
        id: 5,
        title: 'Breaking Bad',
        tvdbId: 81189,
        qualityProfileId: 1,
      },
    },
  };

  const episodeFindUnique = vi.fn().mockResolvedValue(episode);

  const prisma = {
    movie: { findUnique: vi.fn() },
    episode: { findUnique: episodeFindUnique },
    series: { findUnique: vi.fn() },
  } as unknown as ConstructorParameters<typeof WantedSearchService>[1];

  const service = new WantedSearchService(mediaSearchService, prisma, activityEventEmitter);

  return { service, searchAllIndexers, grabRelease, emit, episodeFindUnique };
}

// ─── autoSearchEpisode candidate validation ────────────────────────────────────

describe('WantedSearchService — autoSearchEpisode candidate episode-number validation', () => {
  let service: WantedSearchService;
  let searchAllIndexers: ReturnType<typeof vi.fn>;
  let grabRelease: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const built = makeService();
    service = built.service;
    searchAllIndexers = built.searchAllIndexers;
    grabRelease = built.grabRelease;
  });

  it('grabs the correct S01E01 release when indexer returns exactly matching result', async () => {
    searchAllIndexers.mockResolvedValue({
      releases: [makeCandidate('Breaking.Bad.S01E01.Pilot.1080p.BluRay.mkv', 90)],
    });

    const result = await service.autoSearchEpisode(10);

    expect(result.success).toBe(true);
    expect(grabRelease).toHaveBeenCalledTimes(1);
    expect(grabRelease).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Breaking.Bad.S01E01.Pilot.1080p.BluRay.mkv' }),
      expect.objectContaining({ episodeId: 10 }),
    );
  });

  it('rejects a release with wrong episode number (S01E02 when searching S01E01)', async () => {
    // Indexer returns S01E02 — higher score — but it's the wrong episode
    const wrongEpisode = makeCandidate('Breaking.Bad.S01E02.Cat.In.The.Bag.1080p.mkv', 100);
    const rightEpisode = makeCandidate('Breaking.Bad.S01E01.Pilot.720p.mkv', 80);

    searchAllIndexers.mockResolvedValue({ releases: [wrongEpisode, rightEpisode] });

    const result = await service.autoSearchEpisode(10);

    expect(result.success).toBe(true);
    // Must grab the lower-scored but correct S01E01 release, NOT the S01E02
    expect(grabRelease).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Breaking.Bad.S01E01.Pilot.720p.mkv' }),
      expect.anything(),
    );
    expect(grabRelease).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Breaking.Bad.S01E02.Cat.In.The.Bag.1080p.mkv' }),
      expect.anything(),
    );
  });

  it('rejects a release with wrong season number (S02E01 when searching S01E01)', async () => {
    const wrongSeason = makeCandidate('Breaking.Bad.S02E01.Seven.Thirty-Seven.1080p.mkv', 100);

    searchAllIndexers.mockResolvedValue({ releases: [wrongSeason] });

    const result = await service.autoSearchEpisode(10);

    // No valid candidate → should fail, not grab
    expect(result.success).toBe(false);
    expect(grabRelease).not.toHaveBeenCalled();
  });

  it('rejects a release whose title cannot be parsed as an episode (season pack)', async () => {
    // A season pack has no episode number — should not be grabbed by autoSearchEpisode
    const seasonPack = makeCandidate('Breaking.Bad.S01.Complete.1080p.BluRay.mkv', 100);

    searchAllIndexers.mockResolvedValue({ releases: [seasonPack] });

    const result = await service.autoSearchEpisode(10);

    expect(result.success).toBe(false);
    expect(grabRelease).not.toHaveBeenCalled();
  });

  it('accepts a multi-episode release that contains the requested episode (S01E01E02)', async () => {
    // A dual-episode release — episode 1 is included; this should be accepted
    const multiEp = makeCandidate('Breaking.Bad.S01E01E02.1080p.BluRay.mkv', 90);

    searchAllIndexers.mockResolvedValue({ releases: [multiEp] });

    const result = await service.autoSearchEpisode(10);

    // Parser.parse('S01E01E02') returns episodeNumbers:[1] — the regex captures the SnnEnn
    // group and stops; the trailing E02 is not parsed as a second episode number.
    // Episode 1 is present in the result, so the release is accepted as a valid candidate.
    expect(result.success).toBe(true);
    expect(grabRelease).toHaveBeenCalledTimes(1);
  });

  it('skips the search entirely when all candidates are filtered out', async () => {
    searchAllIndexers.mockResolvedValue({
      releases: [
        makeCandidate('Breaking.Bad.S01E02.Cat.In.The.Bag.1080p.mkv', 100),
        makeCandidate('Breaking.Bad.S02E01.Seven.Thirty-Seven.1080p.mkv', 90),
        makeCandidate('Breaking.Bad.S01.Complete.1080p.BluRay.mkv', 85),
      ],
    });

    const result = await service.autoSearchEpisode(10);

    expect(result.success).toBe(false);
    expect(result.reason).toMatch(/no.*valid.*candidate|no.*match|below threshold|No releases found/i);
    expect(grabRelease).not.toHaveBeenCalled();
  });

  it('BUG: rejects a release from a different series even if season/episode numbers match', async () => {
    // "Better Call Saul S01E01" has the same season+episode as the requested "Breaking Bad S01E01"
    // but is a completely different show. The higher score must NOT cause it to be grabbed.
    // This test FAILS before the fix (current filter only checks season+episode, not series title).
    const wrongSeries = makeCandidate('Better.Call.Saul.S01E01.Pilot.1080p.mkv', 100);
    const rightSeries = makeCandidate('Breaking.Bad.S01E01.Pilot.720p.mkv', 80);

    searchAllIndexers.mockResolvedValue({ releases: [wrongSeries, rightSeries] });

    const result = await service.autoSearchEpisode(10); // episode 10 belongs to Breaking Bad

    expect(result.success).toBe(true);
    expect(grabRelease).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Breaking.Bad.S01E01.Pilot.720p.mkv' }),
      expect.anything(),
    );
    expect(grabRelease).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Better.Call.Saul.S01E01.Pilot.1080p.mkv' }),
      expect.anything(),
    );
  });
});

// ─── isSingleSeasonPack corner cases ─────────────────────────────────────────

describe('WantedSearchService — isSingleSeasonPack multi-season range false positive', () => {
  // Access private method via type cast
  let service: WantedSearchService;

  beforeEach(() => {
    const built = makeService();
    service = built.service;
  });

  function isSingleSeasonPack(title: string): boolean {
    // Access private method for unit testing
    return (service as any).isSingleSeasonPack(title);
  }

  // These SHOULD be identified as single-season packs (existing correct behaviour)
  it('returns true for a standard single-season pack "Show.S01.Complete"', () => {
    expect(isSingleSeasonPack('Breaking.Bad.S01.Complete.1080p.BluRay')).toBe(true);
  });

  it('returns true for a "Season N Complete" style pack', () => {
    expect(isSingleSeasonPack('Breaking.Bad.Season.1.Complete.720p.HDTV')).toBe(true);
  });

  // These MUST NOT be identified as single-season packs (the bug cases)
  it('returns false for a multi-season range pack "Show.S01-S05.Complete"', () => {
    expect(isSingleSeasonPack('The.Wire.S01-S05.Complete.1080p.BluRay')).toBe(false);
  });

  it('returns false for a double-season range "Show.S01-S02.Complete"', () => {
    expect(isSingleSeasonPack('Breaking.Bad.S01-S02.Complete.BluRay')).toBe(false);
  });

  it('returns false for a range with no space "Show.S01-S10.BluRay"', () => {
    expect(isSingleSeasonPack('Some.Show.S01-S10.BluRay.1080p')).toBe(false);
  });

  it('returns false for a range with en-dash separator "Show.S01–S05"', () => {
    expect(isSingleSeasonPack('The.Sopranos.S01–S06.Complete.BluRay')).toBe(false);
  });

  // A full-series pack with no season marker at all (also not a single-season pack)
  it('returns false for a complete series pack with no season marker', () => {
    expect(isSingleSeasonPack('Breaking.Bad.Complete.Series.1080p.BluRay')).toBe(false);
  });
});
