import { describe, expect, it, vi } from 'vitest';
import { classifyAdultFilename, scanAdultLibrary, type ScanFs } from './AdultLibraryScanner';

describe('classifyAdultFilename — the six measured classes', () => {
  it('parses <studio> - <title> <quality> [hash]', () => {
    const info = classifyAdultFilename('Team Skeet - Little Chicks With Tiny Tits 17 Scene 1 1080p [0332f957].mp4');
    expect(info.className).toBe('quality-tagged');
    expect(info.studio).toBe('Team Skeet');
    expect(info.title).toBe('Little Chicks With Tiny Tits 17 Scene 1');
    expect(info.quality).toBe('1080p');
    expect(info.needsReview).toBe(false);
  });

  it('parses a plain title with a hash', () => {
    const info = classifyAdultFilename('Big tits Asian girl squirting compilation #1 [64fa20e9014e3].mp4');
    expect(info.className).toBe('plain-title');
    expect(info.title).toContain('squirting compilation');
  });

  it('parses <title> - <studio>', () => {
    const info = classifyAdultFilename('Asians Love Anal Compilation - Evil Erotic [675da51561367].mp4');
    expect(info.className).toBe('studio-dash-title');
    expect(info.title).toContain('Asians Love Anal Compilation');
  });

  it('does not repeat quality or container tokens inside the title', () => {
    const info = classifyAdultFilename('Mina Tran Analed Asian XXX 1080p MP4 WRB.mp4');
    expect(info.title).toBe('Mina Tran Analed Asian XXX');
    expect(info.quality).toBe('1080p');
  });

  it('keeps a trailing number that is part of the title', () => {
    expect(classifyAdultFilename('Little Chicks With Tiny Tits 17 1080p.mp4').title)
      .toBe('Little Chicks With Tiny Tits 17');
  });

  it('parses underscore titles and keeps the quality', () => {
    const info = classifyAdultFilename('Cheerleaders_In_Heat_Vol_6_4K [b66c8473].mp4');
    expect(info.className).toBe('underscore-title');
    // Quality is extracted into its own field and no longer repeated in the title.
    expect(info.title).toBe('Cheerleaders In Heat Vol 6');
    expect(info.quality).toBe('4k');
  });

  it('cleans a date-stamped scene title of quality/rip tokens', () => {
    const info = classifyAdultFilename('Holed.24.03.08.Mina.Tran.Analed.Asian.XXX.1080p.MP4-WRB[XvX].mp4');
    expect(info.className).toBe('date-prefixed');
    expect(info.title).toBe('Mina Tran Analed Asian XXX');
    expect(info.quality).toBe('1080p');
  });

  it('parses date-prefixed studio names', () => {
    const info = classifyAdultFilename('officepov.26.08.31.compilation [aef072b0].mp4');
    expect(info.className).toBe('date-prefixed');
    expect(info.studio).toBe('officepov');
    expect(info.title).toBe('compilation');
    expect(info.releaseDate).toBe('2026-08-31');
  });

  it('sends a hash-only sequence name to review with no fabricated title', () => {
    const info = classifyAdultFilename('004 [1c6d5a2b].mp4');
    expect(info.className).toBe('seq-only');
    expect(info.title).toBeNull();
    expect(info.needsReview).toBe(true);
  });
});

describe('scanAdultLibrary', () => {
  function fakeFs(tree: Record<string, Array<{ name: string; dir?: boolean }>>): ScanFs {
    return {
      readdir: vi.fn(async (dir: string) => {
        const entries = tree[dir];
        if (!entries) throw new Error(`EACCES ${dir}`);
        return entries.map((entry) => ({
          name: entry.name,
          isDirectory: () => entry.dir === true,
          isFile: () => entry.dir !== true,
        }));
      }),
      stat: vi.fn(async () => ({ size: 1024 })),
    };
  }

  it('walks sub-directories, keeps full paths and counts review cases', async () => {
    const io = fakeFs({
      '/porn': [
        { name: '001 [1c6d5a2b].mp4' },
        { name: 'Little Asians', dir: true },
        { name: 'notes.txt' },
      ],
      '/porn/Little Asians': [
        { name: 'Team Skeet - Scene 1 1080p [a1b2c3].mp4' },
      ],
    });

    const summary = await scanAdultLibrary('/porn', { fs: io });

    expect(summary.videos).toBe(2);
    expect(summary.needsReview).toBe(1);
    expect(summary.entries.map((entry) => entry.relativePath).sort()).toEqual([
      '001 [1c6d5a2b].mp4',
      'Little Asians/Team Skeet - Scene 1 1080p [a1b2c3].mp4',
    ]);
    expect(summary.entries.every((entry) => entry.sizeBytes === 1024)).toBe(true);
  });

  it('reports unreadable directories instead of silently skipping them', async () => {
    const io = fakeFs({ '/porn': [{ name: 'locked', dir: true }] });
    const summary = await scanAdultLibrary('/porn', { fs: io });
    expect(summary.videos).toBe(0);
    expect(summary.unreadableDirectories).toEqual(['/porn/locked']);
  });

  it('ignores non-video files', async () => {
    const io = fakeFs({ '/porn': [{ name: 'cover.jpg' }, { name: 'readme.nfo' }] });
    const summary = await scanAdultLibrary('/porn', { fs: io });
    expect(summary.videos).toBe(0);
  });
});
