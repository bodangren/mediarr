import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ImportManager } from '../server/src/services/ImportManager';
import { EventEmitter } from 'events';
import fs from 'node:fs/promises';

vi.mock('node:fs/promises');
vi.mock('../server/src/services/AiParsingService', () => ({
  aiParsingService: { parse: vi.fn().mockResolvedValue(null) },
}));

describe('ImportManager — Comprehensive Corner Cases', () => {
  let importManager: any;
  let torrentManager: EventEmitter;
  let organizer: any;
  let prisma: any;
  let activityEventEmitter: any;

  beforeEach(() => {
    vi.useFakeTimers();
    torrentManager = new EventEmitter();
    organizer = {
      organizeFile: vi.fn().mockResolvedValue('/media/TV/The Boys/Season 01/The Boys - S01E01 - Pilot.mkv'),
      organizeMovieFile: vi.fn().mockResolvedValue('/media/Movies/The Matrix (1999)/The Matrix (1999).mkv'),
    };
    activityEventEmitter = { emit: vi.fn().mockResolvedValue(undefined) };
    prisma = {
      series: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
      episode: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
      movie: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
      torrent: { findUnique: vi.fn() },
      mediaFileVariant: { upsert: vi.fn().mockResolvedValue({}) },
      appSettings: { findUnique: vi.fn() },
    };
    importManager = new ImportManager(
      torrentManager,
      organizer,
      prisma,
      activityEventEmitter,
      {},
      undefined,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  function emitCompletedTorrent(payload: { infoHash: string; name: string; path: string }) {
    torrentManager.emit('torrent:completed', payload);
    vi.advanceTimersByTime(50);
  }

  function emittedEvents() {
    return activityEventEmitter.emit.mock.calls.map((c: any) => c[0]);
  }

  // ── Phase 1: Slow Path — Episode Matching Corner Cases ───────────────────

  describe('Phase 1: Slow path — episode matching corner cases', () => {
    it('1.1 wrong-episode grab: parses S02E05 but DB only has S01E05 → IMPORT_FAILED', async () => {
      fs.stat.mockResolvedValue({ isDirectory: () => false });
      prisma.torrent.findUnique.mockResolvedValue({ episodeId: null, movieId: null });
      prisma.series.findFirst.mockResolvedValue({ id: 1, title: 'The Boys', path: '/media/TV/The Boys' });
      prisma.episode.findFirst.mockResolvedValue(null);
      prisma.movie.findFirst.mockResolvedValue(null);

      emitCompletedTorrent({
        infoHash: 'hash1',
        name: 'The.Boys.S02E05.1080p.WEB.x264-GRP',
        path: '/downloads/The.Boys.S02E05',
      });

      await vi.advanceTimersByTimeAsync(100);

      const events = emittedEvents();
      const failedEvent = events.find((e: any) => e.eventType === 'IMPORT_FAILED');
      expect(failedEvent).toBeDefined();
      expect(failedEvent.entityRef).toBe('torrent:hash1');
    });

    it('1.2 similar-title cross-series: "The Boys" vs "The Boys from County Clare" → no contamination', async () => {
      fs.stat.mockResolvedValue({ isDirectory: () => false });
      prisma.torrent.findUnique.mockResolvedValue({ episodeId: null, movieId: null });
      prisma.series.findFirst.mockResolvedValue({ id: 99, title: 'The Boys from County Clare', path: '/media/TV/Other' });
      prisma.episode.findFirst.mockResolvedValue(null);
      prisma.movie.findFirst.mockResolvedValue(null);

      emitCompletedTorrent({
        infoHash: 'hash2',
        name: 'The.Boys.S01E01.1080p.WEB.x264-GRP',
        path: '/downloads/The.Boys.S01E01',
      });

      await vi.advanceTimersByTimeAsync(100);

      const events = emittedEvents();
      const importedEvents = events.filter((e: any) => e.eventType === 'SERIES_IMPORTED');
      expect(importedEvents).toHaveLength(0);
    });

    it('1.4 season pack torrent with no episode-specific filename → IMPORT_FAILED', async () => {
      fs.stat.mockResolvedValue({ isDirectory: () => false });
      prisma.torrent.findUnique.mockResolvedValue({ episodeId: null, movieId: null });
      prisma.series.findFirst.mockResolvedValue(null);
      prisma.movie.findFirst.mockResolvedValue(null);

      emitCompletedTorrent({
        infoHash: 'hash3',
        name: 'The.Boys.Complete.Season.01.1080p.WEB.x264-GRP',
        path: '/downloads/Boys.S01',
      });

      await vi.advanceTimersByTimeAsync(100);

      const events = emittedEvents();
      const failedEvent = events.find((e: any) => e.eventType === 'IMPORT_FAILED');
      expect(failedEvent).toBeDefined();
    });

    it('1.5 alternate naming: dots vs spaces → still matches via cleanTitle', async () => {
      fs.stat.mockResolvedValue({ isDirectory: () => false });
      prisma.torrent.findUnique.mockResolvedValue({ episodeId: null, movieId: null });
      prisma.series.findFirst.mockResolvedValue({
        id: 1,
        title: 'The Boys',
        cleanTitle: 'the boys',
        path: '/media/TV/The Boys',
      });
      prisma.episode.findFirst.mockResolvedValue({
        id: 101,
        seriesId: 1,
        seasonNumber: 1,
        episodeNumber: 1,
        title: 'Pilot',
      });

      emitCompletedTorrent({
        infoHash: 'hash4',
        name: 'The.Boys.S01E01.1080p.WEB.x264-GRP',
        path: '/downloads/The.Boys.S01E01',
      });

      await vi.advanceTimersByTimeAsync(100);

      const events = emittedEvents();
      const importedEvent = events.find((e: any) => e.eventType === 'SERIES_IMPORTED');
      expect(importedEvent).toBeDefined();
      expect(organizer.organizeFile).toHaveBeenCalled();
    });
  });

  // ── Phase 2: Slow Path — Movie Matching Corner Cases ─────────────────────

  describe('Phase 2: Slow path — movie matching corner cases', () => {
    it('2.1 movie with year matches DB movie → imported successfully', async () => {
      fs.stat.mockResolvedValue({ isDirectory: () => false });
      prisma.torrent.findUnique.mockResolvedValue({ episodeId: null, movieId: null });
      prisma.series.findFirst.mockResolvedValue(null);
      prisma.movie.findFirst.mockResolvedValue({
        id: 500,
        title: 'The Matrix',
        year: 1999,
        path: '/media/Movies/The Matrix (1999)',
      });
      prisma.appSettings.findUnique.mockResolvedValue({
        mediaManagement: JSON.stringify({ movieRootFolder: '/media/Movies', tvRootFolder: '/media/TV' }),
      });

      emitCompletedTorrent({
        infoHash: 'hash5',
        name: 'The.Matrix.1999.1080p.BluRay.x264-GRP',
        path: '/downloads/The.Matrix.1999',
      });

      await vi.advanceTimersByTimeAsync(100);

      const events = emittedEvents();
      const importedEvent = events.find((e: any) => e.eventType === 'MOVIE_IMPORTED');
      expect(importedEvent).toBeDefined();
      expect(organizer.organizeMovieFile).toHaveBeenCalled();
    });

    it('2.2 movie without year but with quality tag → matches by title', async () => {
      fs.stat.mockResolvedValue({ isDirectory: () => false });
      prisma.torrent.findUnique.mockResolvedValue({ episodeId: null, movieId: null });
      prisma.series.findFirst.mockResolvedValue(null);
      prisma.movie.findFirst.mockResolvedValue({
        id: 501,
        title: 'Inception',
        year: 2010,
        path: '/media/Movies/Inception (2010)',
      });

      emitCompletedTorrent({
        infoHash: 'hash6',
        name: 'Inception.1080p.BluRay.x264-GRP',
        path: '/downloads/Inception',
      });

      await vi.advanceTimersByTimeAsync(100);

      const events = emittedEvents();
      const importedEvent = events.find((e: any) => e.eventType === 'MOVIE_IMPORTED');
      expect(importedEvent).toBeDefined();
    });

    it('2.3 similar title different year → rejected (no fallback to title-only)', async () => {
      fs.stat.mockResolvedValue({ isDirectory: () => false });
      prisma.torrent.findUnique.mockResolvedValue({ episodeId: null, movieId: null });
      prisma.series.findFirst.mockResolvedValue(null);
      prisma.movie.findFirst.mockResolvedValue(null);

      emitCompletedTorrent({
        infoHash: 'hash7',
        name: 'The.Matrix.2003.1080p.BluRay.x264-GRP',
        path: '/downloads/The.Matrix.2003',
      });

      await vi.advanceTimersByTimeAsync(200);

      const events = emittedEvents();
      const importedEvents = events.filter((e: any) => e.eventType === 'MOVIE_IMPORTED');
      expect(importedEvents).toHaveLength(0);
    });

    it('2.4 episode-parsed filename but no DB episode → falls through to movie path', async () => {
      fs.stat.mockResolvedValue({ isDirectory: () => false });
      prisma.torrent.findUnique.mockResolvedValue({ episodeId: null, movieId: null });
      prisma.series.findFirst.mockResolvedValue(null);
      prisma.movie.findFirst.mockResolvedValue({
        id: 502,
        title: 'Some Movie',
        year: 2020,
        path: '/media/Movies/Some Movie (2020)',
      });

      emitCompletedTorrent({
        infoHash: 'hash8',
        name: 'Some.Movie.S01E01.1080p.WEB.x264-GRP',
        path: '/downloads/Some.Movie.S01E01',
      });

      await vi.advanceTimersByTimeAsync(100);

      const events = emittedEvents();
      const importedEvent = events.find((e: any) => e.eventType === 'MOVIE_IMPORTED');
      expect(importedEvent).toBeDefined();
    });

    it('2.5 movie found but no movie root folder → IMPORT_FAILED', async () => {
      fs.stat.mockResolvedValue({ isDirectory: () => false });
      prisma.torrent.findUnique.mockResolvedValue({ episodeId: null, movieId: null });
      prisma.series.findFirst.mockResolvedValue(null);
      prisma.movie.findFirst.mockResolvedValue({
        id: 503,
        title: 'Orphan Movie',
        year: 2009,
        path: null,
      });
      prisma.appSettings.findUnique.mockResolvedValue({
        mediaManagement: JSON.stringify({ movieRootFolder: '', tvRootFolder: '/media/TV' }),
      });

      emitCompletedTorrent({
        infoHash: 'hash9',
        name: 'Orphan.2009.1080p.BluRay.x264-GRP',
        path: '/downloads/Orphan.2009',
      });

      await vi.advanceTimersByTimeAsync(100);

      const events = emittedEvents();
      const failedEvent = events.find((e: any) => e.eventType === 'IMPORT_FAILED');
      expect(failedEvent).toBeDefined();
      expect(failedEvent.details.reason).toContain('movie root folder');
    });
  });

  // ── Phase 3: Fast Path — Linked Episode/Movie Corner Cases ───────────────

  describe('Phase 3: Fast path — linked episode/movie corner cases', () => {
    it('3.1 linked episode exists with TV root folder → imported', async () => {
      fs.stat.mockResolvedValue({ isDirectory: () => false });
      prisma.torrent.findUnique.mockResolvedValue({ episodeId: 101, movieId: null });
      prisma.episode.findUnique.mockResolvedValue({
        id: 101,
        seriesId: 1,
        seasonNumber: 1,
        episodeNumber: 1,
        title: 'Pilot',
        season: {
          series: { id: 1, title: 'The Boys', path: '/media/TV/The Boys' },
        },
      });

      emitCompletedTorrent({
        infoHash: 'hash10',
        name: 'The.Boys.S01E01.1080p.WEB.x264-GRP',
        path: '/downloads/The.Boys.S01E01',
      });

      await vi.advanceTimersByTimeAsync(100);

      const events = emittedEvents();
      const importedEvent = events.find((e: any) => e.eventType === 'SERIES_IMPORTED');
      expect(importedEvent).toBeDefined();
      expect(organizer.organizeFile).toHaveBeenCalled();
    });

    it('3.2 linked episode deleted from DB → IMPORT_FAILED with specific reason', async () => {
      fs.stat.mockResolvedValue({ isDirectory: () => false });
      prisma.torrent.findUnique.mockResolvedValue({ episodeId: 101, movieId: null });
      prisma.episode.findUnique.mockResolvedValue(null);

      emitCompletedTorrent({
        infoHash: 'hash11',
        name: 'The.Boys.S01E01.1080p.WEB.x264-GRP',
        path: '/downloads/The.Boys.S01E01',
      });

      await vi.advanceTimersByTimeAsync(100);

      const events = emittedEvents();
      const failedEvent = events.find((e: any) => e.eventType === 'IMPORT_FAILED');
      expect(failedEvent).toBeDefined();
      expect(failedEvent.details.reason).toContain('linked episode');
    });

    it('3.3 linked episode exists but series has no path and no TV root folder → IMPORT_FAILED', async () => {
      fs.stat.mockResolvedValue({ isDirectory: () => false });
      prisma.torrent.findUnique.mockResolvedValue({ episodeId: 101, movieId: null });
      prisma.episode.findUnique.mockResolvedValue({
        id: 101,
        seriesId: 1,
        seasonNumber: 1,
        episodeNumber: 1,
        title: 'Pilot',
        season: {
          series: { id: 1, title: 'The Boys', path: null },
        },
      });
      prisma.appSettings.findUnique.mockResolvedValue({
        mediaManagement: JSON.stringify({ movieRootFolder: '/media/Movies', tvRootFolder: '' }),
      });

      emitCompletedTorrent({
        infoHash: 'hash12',
        name: 'The.Boys.S01E01.1080p.WEB.x264-GRP',
        path: '/downloads/The.Boys.S01E01',
      });

      await vi.advanceTimersByTimeAsync(100);

      const events = emittedEvents();
      const failedEvent = events.find((e: any) => e.eventType === 'IMPORT_FAILED');
      expect(failedEvent).toBeDefined();
      expect(failedEvent.details.reason).toContain('TV root folder');
    });

    it('3.4 linked movie deleted from DB → IMPORT_FAILED with specific reason', async () => {
      fs.stat.mockResolvedValue({ isDirectory: () => false });
      prisma.torrent.findUnique.mockResolvedValue({ episodeId: null, movieId: 500 });
      prisma.movie.findUnique.mockResolvedValue(null);

      emitCompletedTorrent({
        infoHash: 'hash13',
        name: 'The.Matrix.1999.1080p.BluRay.x264-GRP',
        path: '/downloads/The.Matrix.1999',
      });

      await vi.advanceTimersByTimeAsync(100);

      const events = emittedEvents();
      const failedEvent = events.find((e: any) => e.eventType === 'IMPORT_FAILED');
      expect(failedEvent).toBeDefined();
      expect(failedEvent.details.reason).toContain('linked movie');
    });

    it('3.5 linked movie exists but no movie root folder → IMPORT_FAILED', async () => {
      fs.stat.mockResolvedValue({ isDirectory: () => false });
      prisma.torrent.findUnique.mockResolvedValue({ episodeId: null, movieId: 500 });
      prisma.movie.findUnique.mockResolvedValue({
        id: 500,
        title: 'The Matrix',
        year: 1999,
        path: null,
      });
      prisma.appSettings.findUnique.mockResolvedValue({
        mediaManagement: JSON.stringify({ movieRootFolder: '', tvRootFolder: '/media/TV' }),
      });

      emitCompletedTorrent({
        infoHash: 'hash14',
        name: 'The.Matrix.1999.1080p.BluRay.x264-GRP',
        path: '/downloads/The.Matrix.1999',
      });

      await vi.advanceTimersByTimeAsync(100);

      const events = emittedEvents();
      const failedEvent = events.find((e: any) => e.eventType === 'IMPORT_FAILED');
      expect(failedEvent).toBeDefined();
      expect(failedEvent.details.reason).toContain('movie root folder');
    });

    it('3.6 both episodeId and movieId set → episode path takes priority', async () => {
      fs.stat.mockResolvedValue({ isDirectory: () => false });
      prisma.torrent.findUnique.mockResolvedValue({ episodeId: 101, movieId: 500 });
      prisma.episode.findUnique.mockResolvedValue({
        id: 101,
        seriesId: 1,
        seasonNumber: 1,
        episodeNumber: 1,
        title: 'Pilot',
        season: {
          series: { id: 1, title: 'The Boys', path: '/media/TV/The Boys' },
        },
      });

      emitCompletedTorrent({
        infoHash: 'hash15',
        name: 'The.Boys.S01E01.1080p.WEB.x264-GRP',
        path: '/downloads/The.Boys.S01E01',
      });

      await vi.advanceTimersByTimeAsync(100);

      expect(organizer.organizeFile).toHaveBeenCalled();
      expect(organizer.organizeMovieFile).not.toHaveBeenCalled();
      const events = emittedEvents();
      const importedEvent = events.find((e: any) => e.eventType === 'SERIES_IMPORTED');
      expect(importedEvent).toBeDefined();
    });
  });

  // ── Phase 5: Failed-Import Lifecycle & Seed-Limit Guard ──────────────────

  describe('Phase 5: Failed-import lifecycle & seed-limit guard', () => {
    it('5.1 import fails → IMPORT_FAILED with correct entityRef, sourcePath, reason', async () => {
      fs.stat.mockResolvedValue({ isDirectory: () => false });
      prisma.torrent.findUnique.mockResolvedValue({ episodeId: null, movieId: null });
      prisma.series.findFirst.mockResolvedValue(null);
      prisma.movie.findFirst.mockResolvedValue(null);

      emitCompletedTorrent({
        infoHash: 'hash16',
        name: 'Unknown.Release.S01E01.1080p.x264-GRP',
        path: '/downloads/Unknown',
      });

      await vi.advanceTimersByTimeAsync(100);

      const events = emittedEvents();
      const failedEvent = events.find((e: any) => e.eventType === 'IMPORT_FAILED');
      expect(failedEvent).toBeDefined();
      expect(failedEvent.entityRef).toBe('torrent:hash16');
      expect(failedEvent.details.sourcePath).toBe('/downloads/Unknown');
      expect(failedEvent.details.reason).toBeDefined();
    });

    it('5.4 retryImportByInfoHash when torrent row exists → uses stored path', async () => {
      fs.stat.mockResolvedValue({ isDirectory: () => false });
      prisma.torrent.findUnique.mockResolvedValue({
        infoHash: 'hash17',
        name: 'The.Boys.S01E01.1080p.WEB.x264-GRP',
        path: '/downloads/The.Boys.S01E01',
        episodeId: 101,
        movieId: null,
      });
      prisma.episode.findUnique.mockResolvedValue({
        id: 101,
        seriesId: 1,
        seasonNumber: 1,
        episodeNumber: 1,
        title: 'Pilot',
        season: {
          series: { id: 1, title: 'The Boys', path: '/media/TV/The Boys' },
        },
      });

      await importManager.retryImportByInfoHash('hash17');

      expect(organizer.organizeFile).toHaveBeenCalled();
    });

    it('5.5 retryImportByActivityEventId when torrent row deleted → falls back to activity event sourcePath', async () => {
      prisma.torrent.findUnique.mockResolvedValue(null);
      prisma.activityEvent = { findUnique: vi.fn() };
      prisma.activityEvent.findUnique.mockResolvedValue({
        id: 42,
        eventType: 'IMPORT_FAILED',
        entityRef: 'torrent:hash18',
        details: {
          sourcePath: '/downloads/The.Boys.S01E01',
          torrentName: 'The.Boys.S01E01.1080p.WEB.x264-GRP',
        },
      });
      fs.stat.mockResolvedValue({ isDirectory: () => false });
      prisma.series.findFirst.mockResolvedValue({
        id: 1,
        title: 'The Boys',
        cleanTitle: 'the boys',
        path: '/media/TV/The Boys',
      });
      prisma.episode.findFirst.mockResolvedValue({
        id: 101,
        seriesId: 1,
        seasonNumber: 1,
        episodeNumber: 1,
        title: 'Pilot',
      });

      await importManager.retryImportByActivityEventId(42);

      expect(organizer.organizeFile).toHaveBeenCalled();
    });

    it('5.6 retryImportByActivityEventId when event is not IMPORT_FAILED → throws', async () => {
      prisma.activityEvent = { findUnique: vi.fn() };
      prisma.activityEvent.findUnique.mockResolvedValue({
        id: 43,
        eventType: 'SERIES_IMPORTED',
        entityRef: 'torrent:hash19',
        details: '{}',
      });

      await expect(importManager.retryImportByActivityEventId(43)).rejects.toThrow(/not an import failure/);
    });

    it('5.7 retry import when source files no longer exist → IMPORT_FAILED', async () => {
      prisma.torrent.findUnique.mockResolvedValue({
        infoHash: 'hash20',
        name: 'The.Boys.S01E01.1080p.WEB.x264-GRP',
        path: '/downloads/The.Boys.S01E01',
        episodeId: 101,
        movieId: null,
      });
      fs.stat.mockRejectedValue(new Error('ENOENT'));
      prisma.episode.findUnique.mockResolvedValue({
        id: 101,
        seriesId: 1,
        seasonNumber: 1,
        episodeNumber: 1,
        title: 'Pilot',
        season: {
          series: { id: 1, title: 'The Boys', path: '/media/TV/The Boys' },
        },
      });

      await expect(importManager.retryImportByInfoHash('hash20')).rejects.toThrow();
    });
  });
});
