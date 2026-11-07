import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TvFolderImportService, seriesKey, folderTitle, isConfidentSeriesMatch } from './TvFolderImportService';

describe('TvFolderImportService', () => {
  let root: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'mediarr-tv-'));
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  async function makeSeriesFolder(name: string, files: string[]): Promise<string> {
    const folder = path.join(root, name);
    await fs.mkdir(path.join(folder, 'Season 1'), { recursive: true });
    for (const file of files) {
      await fs.writeFile(path.join(folder, 'Season 1', file), 'x');
    }
    return folder;
  }

  function prismaWith(series: Array<{ title: string; path: string | null }>, profileId = 3) {
    return {
      series: { findMany: vi.fn().mockResolvedValue(series) },
      qualityProfile: { findFirst: vi.fn().mockResolvedValue({ id: profileId }) },
    } as any;
  }

  it('imports a series folder the library does not know', async () => {
    const folder = await makeSeriesFolder('How I Met Your Mother', [
      'How I Met Your Mother - S08E01 - Farhampton.mkv',
    ]);

    const scanner = {
      scan: vi.fn().mockResolvedValue({
        rootPath: folder,
        totalFiles: 1,
        scanDurationMs: 1,
        folders: [{
          path: path.join(folder, 'Season 1'),
          type: 'series',
          files: [{ path: path.join(folder, 'Season 1', 'How I Met Your Mother - S08E01 - Farhampton.mkv'), size: 10, extension: '.mkv' }],
        }],
      }),
    };
    const matchService = {
      searchByTitle: vi.fn().mockResolvedValue([{ id: 4242, title: 'How I Met Your Mother', year: 2005 }]),
    };
    const importService = {
      executeImport: vi.fn().mockResolvedValue({ imported: 1, failed: 0, errors: [] }),
    };

    const service = new TvFolderImportService(prismaWith([]), {} as any, {
      scanner: scanner as any,
      matchService: matchService as any,
      importService: importService as any,
    });

    const stats = await service.run({ tvRootFolder: root });

    expect(stats.foldersScanned).toBe(1);
    expect(stats.imported).toBe(1);
    expect(importService.executeImport).toHaveBeenCalledTimes(1);

    const items = importService.executeImport.mock.calls[0]![0];
    expect(items[0].matchId).toBe(4242);
    expect(items[0].mediaType).toBe('series');
    expect(items[0].rootFolderPath).toBe(root);
    expect(items[0].qualityProfileId).toBe(3);
    // The importer must parse the episode so BulkImport can match the file.
    expect(items[0].files[0].parsedInfo).toMatchObject({ seasonNumber: 8, episodeNumbers: [1] });
  });

  it('skips folders already registered, matching on the on-disk title', async () => {
    await makeSeriesFolder('Archer (2009)', ['Archer (2009) - S01E01 - Mole Hunt.mkv']);

    const scanner = { scan: vi.fn() };
    const importService = { executeImport: vi.fn() };
    const service = new TvFolderImportService(
      prismaWith([{ title: 'Archer (2009)', path: '/data/TV/Archer (2009)' }]),
      {} as any,
      { scanner: scanner as any, matchService: { searchByTitle: vi.fn() } as any, importService: importService as any },
    );

    const stats = await service.run({ tvRootFolder: root });

    expect(stats.foldersSkipped).toBe(1);
    expect(stats.imported).toBe(0);
    expect(scanner.scan).not.toHaveBeenCalled();
    expect(importService.executeImport).not.toHaveBeenCalled();
  });

  it('reports a folder whose metadata match fails instead of failing the task', async () => {
    const folder = await makeSeriesFolder('Some Obscure Show', ['Some Obscure Show S01E01.mkv']);
    const scanner = {
      scan: vi.fn().mockResolvedValue({
        rootPath: folder,
        totalFiles: 1,
        scanDurationMs: 1,
        folders: [{
          path: folder,
          type: 'series',
          files: [{ path: path.join(folder, 'Some Obscure Show S01E01.mkv'), size: 1, extension: '.mkv' }],
        }],
      }),
    };

    const service = new TvFolderImportService(prismaWith([]), {} as any, {
      scanner: scanner as any,
      matchService: { searchByTitle: vi.fn().mockResolvedValue([]) } as any,
      importService: { executeImport: vi.fn() } as any,
    });

    const stats = await service.run({ tvRootFolder: root });

    expect(stats.imported).toBe(0);
    expect(stats.unmatched).toContain('Some Obscure Show');
  });

  it('dry run reports candidates without importing', async () => {
    const folder = await makeSeriesFolder('For All Mankind', ['For All Mankind S02E01.mkv']);
    const importService = { executeImport: vi.fn() };
    const service = new TvFolderImportService(prismaWith([]), {} as any, {
      scanner: {
        scan: vi.fn().mockResolvedValue({
          rootPath: folder,
          totalFiles: 1,
          scanDurationMs: 1,
          folders: [{
            path: folder,
            type: 'series',
            files: [{ path: path.join(folder, 'For All Mankind S02E01.mkv'), size: 1, extension: '.mkv' }],
          }],
        }),
      } as any,
      matchService: { searchByTitle: vi.fn().mockResolvedValue([{ id: 9, title: 'For All Mankind' }]) } as any,
      importService: importService as any,
    });

    const stats = await service.run({ tvRootFolder: root, dryRun: true });

    expect(stats.imported).toBe(1);
    expect(importService.executeImport).not.toHaveBeenCalled();
  });

  it('normalises folder names for matching', () => {
    expect(seriesKey('For All Mankind (2019)')).toBe(seriesKey('For All Mankind'));
    expect(seriesKey('The.Walking.Dead')).toBe(seriesKey('The Walking Dead'));
    expect(seriesKey("Marvel's Agents of S.H.I.E.L.D.")).toBe(seriesKey('Marvels Agents of SHIELD'));
  });

  it('rejects a candidate that is not the same show as the folder', () => {
    // The real mismatches produced by filename-derived matching on 2026-11-08.
    expect(isConfidentSeriesMatch('PONY.MOV', 'Mr. Robot')).toBe(false);
    expect(isConfidentSeriesMatch('Kumamiko - Girl Meets Bear', 'Weeds (2005)')).toBe(false);
    expect(isConfidentSeriesMatch('The Pilot', 'American Dad! (2005)')).toBe(false);
    expect(isConfidentSeriesMatch("I'm Taking the Day Off", 'Inside.Job')).toBe(false);
    // Real matches, including naming variants.
    expect(isConfidentSeriesMatch('How I Met Your Mother', 'How I Met Your Mother')).toBe(true);
    expect(isConfidentSeriesMatch('MobLand', 'Mobland 2025')).toBe(true);
    expect(isConfidentSeriesMatch('The Walking Dead', 'The Walking Dead')).toBe(true);
    expect(isConfidentSeriesMatch('Dark Matter (2024)', 'Dark Matter (2024)')).toBe(true);
  });

  it('cleans folder names into search titles', () => {
    expect(folderTitle('Mobland 2025')).toBe('Mobland');
    expect(folderTitle('For All Mankind (2019)')).toBe('For All Mankind');
    expect(folderTitle('Special Ops: Lioness')).toBe('Special Ops: Lioness');
  });
});
