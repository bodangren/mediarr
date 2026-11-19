import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LibraryFolderImportService,
  folderTitle,
  isConfidentSeriesMatch,
  isExtrasPath,
  seriesKey,
} from './LibraryFolderImportService';

describe('LibraryFolderImportService', () => {
  let root: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'mediarr-import-'));
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  async function makeFolder(name: string, subdir: string, files: string[]): Promise<string> {
    const folder = path.join(root, name);
    await fs.mkdir(path.join(folder, subdir), { recursive: true });
    for (const file of files) await fs.writeFile(path.join(folder, subdir, file), 'x');
    return folder;
  }

  function prismaWith(series: Array<{ title: string; path: string | null }> = [], movies: Array<{ title: string; path: string | null }> = []) {
    return {
      series: { findMany: vi.fn().mockResolvedValue(series) },
      movie: { findMany: vi.fn().mockResolvedValue(movies) },
      episode: { findMany: vi.fn().mockResolvedValue([]) },
      qualityProfile: { findFirst: vi.fn().mockResolvedValue({ id: 3 }) },
    } as any;
  }

  it('imports an unregistered series folder, parsing episode files', async () => {
    const folder = await makeFolder('How I Met Your Mother', 'Season 1', [
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
      searchByTitle: vi.fn().mockResolvedValue([{ id: 4242, title: 'How I Met Your Mother' }]),
    };
    const importService = {
      executeImport: vi.fn().mockResolvedValue({ imported: 1, failed: 0, errors: [] }),
    };

    const service = new LibraryFolderImportService(prismaWith(), {} as any, {
      scanner: scanner as any,
      matchService: matchService as any,
      importService: importService as any,
    });

    const stats = await service.run({ tvRootFolder: root });

    expect(stats.imported).toBe(1);
    const items = importService.executeImport.mock.calls[0]![0];
    expect(items[0]).toMatchObject({
      mediaType: 'series',
      matchId: 4242,
      rootFolderPath: root,
      qualityProfileId: 3,
      renameFiles: false,
    });
    expect(items[0].files[0].parsedInfo).toMatchObject({ seasonNumber: 8, episodeNumbers: [1] });
  });

  it('imports an unregistered movie folder', async () => {
    const folder = await makeFolder('The Brothers Grimm (2005)', '', [
      'The Brothers Grimm (2005).mkv',
    ]);

    const importService = {
      executeImport: vi.fn().mockResolvedValue({ imported: 1, failed: 0, errors: [] }),
    };
    const matchService = {
      searchByTitle: vi.fn().mockResolvedValue([{ id: 77, title: 'The Brothers Grimm', year: 2005 }]),
    };

    const service = new LibraryFolderImportService(prismaWith(), {} as any, {
      scanner: {
        scan: vi.fn().mockResolvedValue({
          rootPath: folder,
          totalFiles: 1,
          scanDurationMs: 1,
          folders: [{
            path: folder,
            type: 'movie',
            files: [{ path: path.join(folder, 'The Brothers Grimm (2005).mkv'), size: 1, extension: '.mkv' }],
          }],
        }),
      } as any,
      matchService: matchService as any,
      importService: importService as any,
    });

    const stats = await service.run({ movieRootFolder: root });

    expect(stats.imported).toBe(1);
    const items = importService.executeImport.mock.calls[0]![0];
    expect(items[0].mediaType).toBe('movie');
    expect(items[0].matchId).toBe(77);
  });

  it('skips folders already registered by title', async () => {
    await makeFolder('Archer (2009)', '', ['x.mkv']);
    const scanner = { scan: vi.fn() };
    const importService = { executeImport: vi.fn() };
    const service = new LibraryFolderImportService(
      prismaWith([{ title: 'Archer (2009)', path: null }]),
      {} as any,
      { scanner: scanner as any, matchService: { searchByTitle: vi.fn() } as any, importService: importService as any },
    );

    const stats = await service.run({ tvRootFolder: root });

    expect(stats.foldersSkipped).toBe(1);
    expect(scanner.scan).not.toHaveBeenCalled();
  });

  it('reports a folder whose metadata match is not confident', async () => {
    const folder = await makeFolder('Special Ops: Lioness', 'Season 1', ['Special Ops Lioness S01E01.mkv']);
    const service = new LibraryFolderImportService(prismaWith(), {} as any, {
      scanner: {
        scan: vi.fn().mockResolvedValue({
          rootPath: folder,
          totalFiles: 1,
          scanDurationMs: 1,
          folders: [{
            path: folder,
            type: 'series',
            files: [{ path: path.join(folder, 'Season 1', 'Special Ops Lioness S01E01.mkv'), size: 1, extension: '.mkv' }],
          }],
        }),
      } as any,
      matchService: { searchByTitle: vi.fn().mockResolvedValue([{ id: 5, title: 'Lioness' }]) } as any,
      importService: { executeImport: vi.fn() } as any,
    });

    const stats = await service.run({ tvRootFolder: root });

    expect(stats.imported).toBe(0);
    expect(stats.unmatched).toContain('Special Ops: Lioness');
  });

  it('rejects the mismatches filename-matching produced on 2026-11-08', () => {
    expect(isConfidentSeriesMatch('PONY.MOV', 'Mr. Robot')).toBe(false);
    expect(isConfidentSeriesMatch('Kumamiko - Girl Meets Bear', 'Weeds (2005)')).toBe(false);
    expect(isConfidentSeriesMatch('The Pilot', 'American Dad! (2005)')).toBe(false);
    expect(isConfidentSeriesMatch('How I Met Your Mother', 'How I Met Your Mother')).toBe(true);
    expect(isConfidentSeriesMatch('MobLand', 'Mobland 2025')).toBe(true);
    expect(isConfidentSeriesMatch('The Brothers Grimm', 'The Brothers Grimm (2005)')).toBe(true);
  });

  it('cleans folder names into search titles', () => {
    expect(folderTitle('Mobland 2025')).toBe('Mobland');
    expect(folderTitle('For All Mankind (2019)')).toBe('For All Mankind');
    expect(folderTitle('The Brothers Grimm (2005)')).toBe('The Brothers Grimm');
    expect(seriesKey('The.Walking.Dead')).toBe(seriesKey('The Walking Dead'));
  });
  it('imports episodes added to a series the database already knows', async () => {
    // The folder importer skips registered series, so new episodes inside an
    // existing show were never catalogued (279 files on 2026-11-08).
    const seriesFolder = path.join(root, 'The Sopranos');
    await fs.mkdir(path.join(seriesFolder, 'Season 1'), { recursive: true });
    await fs.writeFile(path.join(seriesFolder, 'Season 1', 'The Sopranos - S01E01 - Pilot.mkv'), 'x');
    await fs.writeFile(path.join(seriesFolder, 'Season 1', 'The Sopranos - S01E02 - 46 Long.mkv'), 'x');

    const prisma = {
      series: {
        findMany: vi.fn().mockResolvedValue([
          { id: 7, tvdbId: 73329, title: 'The Sopranos', path: seriesFolder },
        ]),
      },
      movie: { findMany: vi.fn().mockResolvedValue([]) },
      episode: {
        // First call feeds knownPaths, second feeds the series' episode rows.
        findMany: vi.fn()
          .mockResolvedValueOnce([
            { path: path.join(seriesFolder, 'Season 1', 'The Sopranos - S01E01 - Pilot.mkv') },
          ])
          .mockResolvedValueOnce([
            { seasonNumber: 1, episodeNumber: 1, path: path.join(seriesFolder, 'Season 1', 'The Sopranos - S01E01 - Pilot.mkv') },
            { seasonNumber: 1, episodeNumber: 2, path: null },
          ]),
      },
      qualityProfile: { findFirst: vi.fn().mockResolvedValue({ id: 3 }) },
    } as any;

    const importService = {
      executeImport: vi.fn().mockResolvedValue({ imported: 1, failed: 0, errors: [] }),
    };
    const service = new LibraryFolderImportService(prisma, {} as any, {
      scanner: { scan: vi.fn() } as any,
      matchService: { searchByTitle: vi.fn() } as any,
      importService: importService as any,
    });

    const stats = await service.run({ tvRootFolder: root });
    expect(stats.imported).toBe(1);
    const items = importService.executeImport.mock.calls[0]![0];
    expect(items[0].matchId).toBe(73329);
    // Only the unregistered file is imported; the known one is not re-sent.
    expect(items[0].files).toHaveLength(1);
    expect(items[0].files[0].path).toContain('S01E02');
  });

  it('never treats bonus material as missing episodes', async () => {
    // Measured 2026-11-19: six files under `Season NN/Featurettes/` were retried
    // as missing episodes on every pass, each attempt hitting the metadata
    // provider and failing (`[BulkImport] Failed to import "/data/TV/Archer
    // (2009)": fetch failed` twice per pass, indefinitely). A successful fetch
    // would have filed them as episodes.
    const seriesFolder = path.join(root, 'Archer (2009)');
    await fs.mkdir(path.join(seriesFolder, 'Season 02', 'Featurettes'), { recursive: true });
    await fs.writeFile(path.join(seriesFolder, 'Season 02', 'Featurettes', 'Comic-con.mkv'), 'x');
    await fs.writeFile(path.join(seriesFolder, 'Season 02', 'Featurettes', 'Dear Archer.mkv'), 'x');

    const prisma = {
      series: {
        findMany: vi.fn().mockResolvedValue([
          { id: 9, tvdbId: 23354, title: 'Archer (2009)', path: seriesFolder },
        ]),
      },
      movie: { findMany: vi.fn().mockResolvedValue([]) },
      episode: { findMany: vi.fn().mockResolvedValue([]) },
      qualityProfile: { findFirst: vi.fn().mockResolvedValue({ id: 3 }) },
    } as any;

    const importService = { executeImport: vi.fn() };
    const service = new LibraryFolderImportService(prisma, {} as any, {
      scanner: { scan: vi.fn() } as any,
      matchService: { searchByTitle: vi.fn() } as any,
      importService: importService as any,
    });

    const stats = await service.run({ tvRootFolder: root });
    expect(stats.imported).toBe(0);
    expect(stats.failed).toBe(0);
    expect(importService.executeImport).not.toHaveBeenCalled();
  });

  it('still imports a real episode that sits next to an extras folder', async () => {
    const seriesFolder = path.join(root, 'Archer (2009)');
    await fs.mkdir(path.join(seriesFolder, 'Season 02', 'Featurettes'), { recursive: true });
    await fs.writeFile(path.join(seriesFolder, 'Season 02', 'Archer (2009) - S02E01 - The Holdout.mkv'), 'x');
    await fs.writeFile(path.join(seriesFolder, 'Season 02', 'Featurettes', 'Comic-con.mkv'), 'x');

    const prisma = {
      series: {
        findMany: vi.fn().mockResolvedValue([
          { id: 9, tvdbId: 23354, title: 'Archer (2009)', path: seriesFolder },
        ]),
      },
      movie: { findMany: vi.fn().mockResolvedValue([]) },
      episode: { findMany: vi.fn().mockResolvedValue([]) },
      qualityProfile: { findFirst: vi.fn().mockResolvedValue({ id: 3 }) },
    } as any;
    const importService = {
      executeImport: vi.fn().mockResolvedValue({ imported: 1, failed: 0, errors: [] }),
    };
    const service = new LibraryFolderImportService(prisma, {} as any, {
      scanner: { scan: vi.fn() } as any,
      matchService: { searchByTitle: vi.fn() } as any,
      importService: importService as any,
    });

    const stats = await service.run({ tvRootFolder: root });
    expect(stats.imported).toBe(1);
    const files = importService.executeImport.mock.calls[0]![0][0].files;
    expect(files).toHaveLength(1);
    expect(files[0].path).toContain('S02E01');
  });

  it('imports a new video from a folder whose name matches a known movie', async () => {
    // Measured 2026-11-19: 15 video files sat inside folders whose names matched
    // a library row (Sinners, Ballerina, Beetlejuice, ...). The folder-name skip
    // kept them invisible even though the client should show every playable file.
    const folder = path.join(root, 'Sinners (2025)');
    await fs.mkdir(folder, { recursive: true });
    await fs.writeFile(path.join(folder, 'Sinners (2025).mkv'), 'x');
    await fs.writeFile(path.join(folder, 'Sinners.2025.1080p.WEB-DL.x265-NeoNoir.mkv'), 'x');

    const prisma = {
      movie: {
        findMany: vi.fn().mockResolvedValue([
          { id: 351, title: 'Sinners', path: path.join(folder, 'Sinners (2025).mkv') },
        ]),
      },
      series: { findMany: vi.fn().mockResolvedValue([]) },
      episode: { findMany: vi.fn().mockResolvedValue([]) },
      mediaFileVariant: {
        findMany: vi.fn().mockResolvedValue([
          { path: path.join(folder, 'Sinners (2025).mkv') },
        ]),
      },
      qualityProfile: { findFirst: vi.fn().mockResolvedValue({ id: 3 }) },
    } as any;

    const importService = {
      executeImport: vi.fn().mockResolvedValue({ imported: 1, failed: 0, errors: [] }),
    };
    const matchService = {
      searchByTitle: vi.fn().mockResolvedValue([
        { id: 1234, title: 'Sinners', year: 2025 },
      ]),
    };
    const service = new LibraryFolderImportService(prisma, {} as any, {
      scanner: {
        scan: vi.fn().mockResolvedValue({
          folders: [{
            path: folder,
            files: [
              { path: path.join(folder, 'Sinners (2025).mkv'), size: 1, extension: '.mkv' },
              { path: path.join(folder, 'Sinners.2025.1080p.WEB-DL.x265-NeoNoir.mkv'), size: 1, extension: '.mkv' },
            ],
          }],
        }),
      } as any,
      matchService: matchService as any,
      importService: importService as any,
    });

    const stats = await service.run({ movieRootFolder: root });
    expect(stats.imported).toBe(1);
    const files = importService.executeImport.mock.calls[0]![0][0].files;
    expect(files.map((f: any) => f.path)).toEqual([
      path.join(folder, 'Sinners.2025.1080p.WEB-DL.x265-NeoNoir.mkv'),
    ]);
  });

  it('still skips a known movie folder whose every video is registered', async () => {
    const folder = path.join(root, 'Sinners (2025)');
    await fs.mkdir(folder, { recursive: true });
    await fs.writeFile(path.join(folder, 'Sinners (2025).mkv'), 'x');

    const prisma = {
      movie: {
        findMany: vi.fn().mockResolvedValue([
          { id: 351, title: 'Sinners', path: path.join(folder, 'Sinners (2025).mkv') },
        ]),
      },
      series: { findMany: vi.fn().mockResolvedValue([]) },
      episode: { findMany: vi.fn().mockResolvedValue([]) },
      mediaFileVariant: { findMany: vi.fn().mockResolvedValue([]) },
      qualityProfile: { findFirst: vi.fn().mockResolvedValue({ id: 3 }) },
    } as any;
    const importService = { executeImport: vi.fn() };
    const service = new LibraryFolderImportService(prisma, {} as any, {
      scanner: { scan: vi.fn() } as any,
      matchService: { searchByTitle: vi.fn() } as any,
      importService: importService as any,
    });

    const stats = await service.run({ movieRootFolder: root });
    expect(stats.foldersSkipped).toBe(1);
    expect(importService.executeImport).not.toHaveBeenCalled();
  });

  it('does not retry files whose episode the library does not have', async () => {
    // Measured 2026-11-19: Mr. Inbetween's 2005 special parsed as S00E01, the
    // series has no season-0 rows, so every pass re-imported it for days.
    const seriesFolder = path.join(root, 'Mr. Inbetween');
    await fs.mkdir(path.join(seriesFolder, 'Season 0'), { recursive: true });
    await fs.writeFile(path.join(seriesFolder, 'Season 0', 'Mr. Inbetween - S00E01 - The Magician (2005).mp4'), 'x');

    const prisma = {
      series: {
        findMany: vi.fn().mockResolvedValue([
          { id: 11, tvdbId: 555, title: 'Mr. Inbetween', path: seriesFolder },
        ]),
      },
      movie: { findMany: vi.fn().mockResolvedValue([]) },
      episode: {
        findMany: vi.fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([
            { seasonNumber: 1, episodeNumber: 1, path: null },
          ]),
      },
      qualityProfile: { findFirst: vi.fn().mockResolvedValue({ id: 3 }) },
    } as any;

    const importService = { executeImport: vi.fn() };
    const service = new LibraryFolderImportService(prisma, {} as any, {
      scanner: { scan: vi.fn() } as any,
      matchService: { searchByTitle: vi.fn() } as any,
      importService: importService as any,
    });

    const stats = await service.run({ tvRootFolder: root });
    expect(importService.executeImport).not.toHaveBeenCalled();
    expect(stats.imported).toBe(0);
    expect(stats.unknownEpisodeFiles).toHaveLength(1);
    expect(stats.unknownEpisodeFiles[0]).toContain('S00E01');
  });

  it('still imports a file for an episode the library knows', async () => {
    const seriesFolder = path.join(root, 'Mr. Inbetween');
    await fs.mkdir(path.join(seriesFolder, 'Season 1'), { recursive: true });
    await fs.writeFile(path.join(seriesFolder, 'Season 1', 'Mr. Inbetween - S01E02 - Unicorns.mkv'), 'x');

    const prisma = {
      series: {
        findMany: vi.fn().mockResolvedValue([
          { id: 11, tvdbId: 555, title: 'Mr. Inbetween', path: seriesFolder },
        ]),
      },
      movie: { findMany: vi.fn().mockResolvedValue([]) },
      episode: {
        findMany: vi.fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([
            { seasonNumber: 1, episodeNumber: 2, path: null },
          ]),
      },
      qualityProfile: { findFirst: vi.fn().mockResolvedValue({ id: 3 }) },
    } as any;
    const importService = { executeImport: vi.fn().mockResolvedValue({ imported: 1, failed: 0, errors: [] }) };
    const service = new LibraryFolderImportService(prisma, {} as any, {
      scanner: { scan: vi.fn() } as any,
      matchService: { searchByTitle: vi.fn() } as any,
      importService: importService as any,
    });

    const stats = await service.run({ tvRootFolder: root });
    expect(stats.imported).toBe(1);
    expect(stats.unknownEpisodeFiles).toHaveLength(0);
  });
});

describe('isExtrasPath', () => {
  it('recognises bonus-material directories at any depth', () => {
    expect(isExtrasPath('/tv/Archer (2009)/Season 02/Featurettes/Comic-con.mkv', '/tv/Archer (2009)')).toBe(true);
    expect(isExtrasPath('/tv/Show/Extras/keys/promo.mkv')).toBe(true);
    expect(isExtrasPath('/tv/Show/Bonus Material/clip.mp4')).toBe(true);
    expect(isExtrasPath('/tv/Show/Season 1/Show - S01E01.mkv')).toBe(false);
    expect(isExtrasPath('/tv/Show/Show - S01E01.mkv')).toBe(false);
  });

  it('does not mistake a title containing the word for an extras folder', () => {
    expect(isExtrasPath('/tv/Extras (2021)/Season 1/Extras - S01E01.mkv', '/tv/Extras (2021)')).toBe(false);
  });
});
