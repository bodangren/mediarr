import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SubtitleInventoryApiService } from './SubtitleInventoryApiService';
import { SubtitleProviderFactory } from './SubtitleProviderFactory';
import type { SubtitleVariantRepository } from '../repositories/SubtitleVariantRepository';
import type { SubtitleNamingService } from './SubtitleNamingService';
import type { ActivityEventEmitter } from './ActivityEventEmitter';

describe('SubtitleInventoryApiService manual search/download', () => {
  const tempDirectories: string[] = [];

  afterEach(async () => {
    await Promise.all(tempDirectories.map(async dir => {
      await fs.rm(dir, { recursive: true, force: true });
    }));
    tempDirectories.length = 0;
  });

  it('continues searching when one provider fails', async () => {
    const repository = {
      getVariantInventory: vi.fn().mockResolvedValue({
        variant: {
          id: 1,
          path: '/tmp/movie.mkv',
          releaseName: 'Movie.Name.2025',
        },
        audioTracks: [],
        subtitleTracks: [],
        missingSubtitles: [],
      }),
    };

    const workingProvider = {
      search: vi.fn().mockResolvedValue([
        {
          languageCode: 'en',
          isForced: false,
          isHi: false,
          provider: 'opensubtitles',
          score: 10,
        },
      ]),
      download: vi.fn(),
    };

    const failingProvider = {
      search: vi.fn().mockRejectedValue(new Error('boom')),
      download: vi.fn(),
    };

    const factory = new SubtitleProviderFactory(
      {
        opensubtitles: workingProvider,
        assrt: failingProvider,
      },
      () => ({ manualProvider: 'opensubtitles' }),
    );

    const service = new SubtitleInventoryApiService(
      repository as unknown as SubtitleVariantRepository,
      undefined,
      factory,
    );
    const results = await service.manualSearch({ variantId: 1 });

    expect(results).toHaveLength(1);
    expect(results[0]?.provider).toBe('opensubtitles');
  });

  it('writes downloaded subtitle content to disk', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mediarr-manual-download-'));
    tempDirectories.push(tempDir);

    const variantPath = path.join(tempDir, 'Movie.Name.2025.mkv');

    const repository = {
      getVariantInventory: vi.fn().mockResolvedValue({
        variant: {
          id: 1,
          path: variantPath,
          releaseName: 'Movie.Name.2025',
        },
        audioTracks: [],
        subtitleTracks: [],
        missingSubtitles: [],
      }),
      listSiblingSubtitlePaths: vi.fn().mockResolvedValue([]),
      createSubtitleTrack: vi.fn().mockResolvedValue({ id: 11 }),
      createSubtitleHistory: vi.fn().mockResolvedValue({ id: 22 }),
      upsertWantedSubtitle: vi.fn().mockResolvedValue({ id: 33 }),
      updateWantedSubtitleState: vi.fn().mockResolvedValue({ id: 33 }),
      deleteSubtitleTrack: vi.fn().mockResolvedValue(undefined),
      deleteSubtitleHistory: vi.fn().mockResolvedValue(undefined),
    };

    const provider = {
      search: vi.fn(),
      download: vi.fn(async candidate => ({
        ...candidate,
        content: Buffer.from('subtitle body'),
      })),
    };

    const factory = new SubtitleProviderFactory(
      {
        opensubtitles: provider,
      },
      () => ({ manualProvider: 'opensubtitles' }),
    );

    const service = new SubtitleInventoryApiService(
      repository as unknown as SubtitleVariantRepository,
      undefined,
      factory,
    );
    const result = await service.manualDownload({
      variantId: 1,
      candidate: {
        languageCode: 'en',
        isForced: false,
        isHi: false,
        provider: 'opensubtitles',
        score: 1,
        extension: '.srt',
      },
    });

    const written = await fs.readFile(result.storedPath, 'utf8');
    expect(written).toContain('subtitle body');
    expect(repository.createSubtitleTrack).toHaveBeenCalledOnce();
    expect(repository.updateWantedSubtitleState).toHaveBeenLastCalledWith(33, 'DOWNLOADED');
  });

  it.each([
    ['missing', undefined],
    ['zero-byte', Buffer.alloc(0)],
  ])('rejects %s manual provider content before file or subtitle-track creation', async (_label, content) => {
    const repository = {
      getVariantInventory: vi.fn().mockResolvedValue({
        variant: { id: 1, path: '/tmp/movie.mkv', releaseName: 'Movie.Name.2025' },
        audioTracks: [],
        subtitleTracks: [],
        missingSubtitles: [],
      }),
      listSiblingSubtitlePaths: vi.fn().mockResolvedValue([]),
      createSubtitleTrack: vi.fn(),
      createSubtitleHistory: vi.fn().mockResolvedValue({ id: 22 }),
      upsertWantedSubtitle: vi.fn().mockResolvedValue({ id: 33 }),
      updateWantedSubtitleState: vi.fn().mockResolvedValue({ id: 33 }),
      deleteSubtitleTrack: vi.fn(),
      deleteSubtitleHistory: vi.fn(),
    };
    const provider = {
      search: vi.fn(),
      download: vi.fn(async candidate => ({ ...candidate, content })),
    };
    const factory = new SubtitleProviderFactory(
      { opensubtitles: provider },
      () => ({ manualProvider: 'opensubtitles' }),
    );
    const activityEmitter = { emit: vi.fn().mockResolvedValue(undefined) };
    const service = new SubtitleInventoryApiService(
      repository as unknown as SubtitleVariantRepository,
      undefined,
      factory,
      undefined,
      activityEmitter as unknown as ActivityEventEmitter,
    );

    await expect(service.manualDownload({
      variantId: 1,
      candidate: {
        languageCode: 'en',
        isForced: false,
        isHi: false,
        provider: 'opensubtitles',
        score: 1,
      },
    })).rejects.toThrow('Subtitle provider returned missing or empty content');

    expect(repository.createSubtitleTrack).not.toHaveBeenCalled();
    expect(repository.updateWantedSubtitleState).toHaveBeenLastCalledWith(33, 'FAILED');
    expect(repository.createSubtitleHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        wantedSubtitleId: 33,
        message: expect.stringContaining('failed'),
      }),
    );
    expect(activityEmitter.emit).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
    );
  });

  it('cleans the written file and leaves FAILED metadata when track persistence fails', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mediarr-manual-failure-'));
    tempDirectories.push(tempDir);
    const storedPath = path.join(tempDir, 'Movie.Name.2025.en.srt');
    const repository = {
      getVariantInventory: vi.fn().mockResolvedValue({
        variant: { id: 1, path: path.join(tempDir, 'Movie.Name.2025.mkv'), releaseName: 'Movie.Name.2025' },
        audioTracks: [],
        subtitleTracks: [],
        missingSubtitles: [],
      }),
      listSiblingSubtitlePaths: vi.fn().mockResolvedValue([]),
      createSubtitleTrack: vi.fn().mockRejectedValue(new Error('track database unavailable')),
      createSubtitleHistory: vi.fn().mockResolvedValue({ id: 22 }),
      upsertWantedSubtitle: vi.fn().mockResolvedValue({ id: 33 }),
      updateWantedSubtitleState: vi.fn().mockResolvedValue({ id: 33 }),
      deleteSubtitleTrack: vi.fn(),
      deleteSubtitleHistory: vi.fn(),
    };
    const provider = {
      search: vi.fn(),
      download: vi.fn(async candidate => ({ ...candidate, content: Buffer.from('subtitle body') })),
    };
    const factory = new SubtitleProviderFactory(
      { opensubtitles: provider },
      () => ({ manualProvider: 'opensubtitles' }),
    );
    const namingService = { buildSubtitlePath: vi.fn().mockReturnValue(storedPath) };
    const activityEmitter = { emit: vi.fn().mockResolvedValue(undefined) };
    const service = new SubtitleInventoryApiService(
      repository as unknown as SubtitleVariantRepository,
      namingService as unknown as SubtitleNamingService,
      factory,
      undefined,
      activityEmitter as unknown as ActivityEventEmitter,
    );

    await expect(service.manualDownload({
      variantId: 1,
      candidate: {
        languageCode: 'en',
        isForced: false,
        isHi: false,
        provider: 'opensubtitles',
        score: 1,
      },
    })).rejects.toThrow('track database unavailable');

    await expect(fs.access(storedPath)).rejects.toThrow();
    expect(repository.updateWantedSubtitleState).toHaveBeenLastCalledWith(33, 'FAILED');
    expect(repository.createSubtitleHistory).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('track database unavailable') }),
    );
    expect(activityEmitter.emit).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
    );
  });

  it('records provider download exceptions as retryable FAILED state', async () => {
    const repository = {
      getVariantInventory: vi.fn().mockResolvedValue({
        variant: { id: 1, path: '/tmp/movie.mkv', releaseName: 'Movie.Name.2025' },
        audioTracks: [],
        subtitleTracks: [],
        missingSubtitles: [],
      }),
      createSubtitleHistory: vi.fn().mockResolvedValue({ id: 22 }),
      upsertWantedSubtitle: vi.fn().mockResolvedValue({ id: 33 }),
      updateWantedSubtitleState: vi.fn().mockResolvedValue({ id: 33 }),
    };
    const provider = {
      search: vi.fn(),
      download: vi.fn().mockRejectedValue(new Error('provider offline')),
    };
    const factory = new SubtitleProviderFactory(
      { opensubtitles: provider },
      () => ({ manualProvider: 'opensubtitles' }),
    );
    const activityEmitter = { emit: vi.fn().mockResolvedValue(undefined) };
    const service = new SubtitleInventoryApiService(
      repository as unknown as SubtitleVariantRepository,
      undefined,
      factory,
      undefined,
      activityEmitter as unknown as ActivityEventEmitter,
    );

    await expect(service.manualDownload({
      variantId: 1,
      candidate: {
        languageCode: 'en',
        isForced: false,
        isHi: false,
        provider: 'opensubtitles',
        score: 1,
      },
    })).rejects.toThrow('provider offline');

    expect(repository.updateWantedSubtitleState).toHaveBeenLastCalledWith(33, 'FAILED');
    expect(repository.createSubtitleHistory).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('provider offline') }),
    );
    expect(activityEmitter.emit).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it('records filesystem write failures as retryable FAILED state', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mediarr-manual-fs-failure-'));
    tempDirectories.push(tempDir);
    const repository = {
      getVariantInventory: vi.fn().mockResolvedValue({
        variant: { id: 1, path: path.join(tempDir, 'movie.mkv'), releaseName: 'Movie.Name.2025' },
        audioTracks: [],
        subtitleTracks: [],
        missingSubtitles: [],
      }),
      listSiblingSubtitlePaths: vi.fn().mockResolvedValue([]),
      createSubtitleTrack: vi.fn(),
      createSubtitleHistory: vi.fn().mockResolvedValue({ id: 22 }),
      upsertWantedSubtitle: vi.fn().mockResolvedValue({ id: 33 }),
      updateWantedSubtitleState: vi.fn().mockResolvedValue({ id: 33 }),
    };
    const provider = {
      search: vi.fn(),
      download: vi.fn(async candidate => ({ ...candidate, content: Buffer.from('subtitle body') })),
    };
    const factory = new SubtitleProviderFactory(
      { opensubtitles: provider },
      () => ({ manualProvider: 'opensubtitles' }),
    );
    const namingService = { buildSubtitlePath: vi.fn().mockReturnValue(tempDir) };
    const activityEmitter = { emit: vi.fn().mockResolvedValue(undefined) };
    const service = new SubtitleInventoryApiService(
      repository as unknown as SubtitleVariantRepository,
      namingService as unknown as SubtitleNamingService,
      factory,
      undefined,
      activityEmitter as unknown as ActivityEventEmitter,
    );

    await expect(service.manualDownload({
      variantId: 1,
      candidate: {
        languageCode: 'en',
        isForced: false,
        isHi: false,
        provider: 'opensubtitles',
        score: 1,
      },
    })).rejects.toThrow();

    expect(repository.createSubtitleTrack).not.toHaveBeenCalled();
    expect(repository.updateWantedSubtitleState).toHaveBeenLastCalledWith(33, 'FAILED');
    expect(repository.createSubtitleHistory).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('failed') }),
    );
    expect(activityEmitter.emit).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });
});
