import { describe, expect, it } from 'vitest';

import { normalizeSubtitleFiles, normalizeSubtitleScript } from './SubtitleScriptNormalizer';

const TRADITIONAL = '1\n00:00:01,000 --> 00:00:02,000\n你們沒有那些東西？\n';
const SIMPLIFIED = '1\n00:00:01,000 --> 00:00:02,000\n你们没有那些东西？\n';

function fakeFs(initial: Record<string, string>) {
  const files = { ...initial };
  const writes: string[] = [];
  const copies: Array<[string, string]> = [];
  return {
    files,
    writes,
    copies,
    readFile: async (file: string) => {
      if (!(file in files)) throw new Error('ENOENT');
      return files[file]!;
    },
    writeFile: async (file: string, text: string) => { files[file] = text; writes.push(file); },
    rename: async (from: string, to: string) => { files[to] = files[from]!; delete files[from]; },
    copyFile: async (from: string, to: string) => { files[to] = files[from]!; copies.push([from, to]); },
  };
}

describe('normalizeSubtitleScript', () => {
  it('dry-run reports the conversion without writing', async () => {
    const fs = fakeFs({ '/s/a.zh.srt': TRADITIONAL });
    const result = await normalizeSubtitleScript('/s/a.zh.srt', {
      convert: async () => SIMPLIFIED,
      readFile: fs.readFile,
      writeFile: fs.writeFile,
      copyFile: fs.copyFile,
    });
    expect(result).toMatchObject({ action: 'would-convert', sampleBefore: '你們沒有那些東西？', sampleAfter: '你们没有那些东西？' });
    expect(fs.files['/s/a.zh.srt']).toBe(TRADITIONAL);
    expect(fs.copies).toHaveLength(0);
  });

  it('live conversion writes a dated backup and the converted file', async () => {
    const fs = fakeFs({ '/s/a.zh.srt': TRADITIONAL });
    const result = await normalizeSubtitleScript('/s/a.zh.srt', {
      live: true,
      convert: async () => SIMPLIFIED,
      readFile: fs.readFile,
      writeFile: fs.writeFile,
      copyFile: fs.copyFile,
      rename: fs.rename,
      now: new Date('2026-11-09T00:00:00Z'),
    });
    expect(result.action).toBe('converted');
    expect(result.backupPath).toBe('/s/a.zh.srt.hant-2026-11-09');
    expect(fs.files['/s/a.zh.srt']).toBe(SIMPLIFIED);
    expect(fs.files['/s/a.zh.srt.hant-2026-11-09']).toBe(TRADITIONAL);
  });

  it('skips already-simplified files and conversion failures', async () => {
    const fs = fakeFs({ '/s/simplified.zh.srt': SIMPLIFIED, '/s/broken.zh.srt': TRADITIONAL });
    expect((await normalizeSubtitleScript('/s/simplified.zh.srt', { readFile: fs.readFile })).action).toBe('skipped');
    const failed = await normalizeSubtitleScript('/s/broken.zh.srt', {
      convert: async () => { throw new Error('opencc missing'); },
      readFile: fs.readFile,
    });
    expect(failed.reason).toContain('conversion failed');
  });
});

describe('normalizeSubtitleFiles', () => {
  it('converts traditional files until the limit and counts outcomes', async () => {
    const calls: string[] = [];
    const result = await normalizeSubtitleFiles(['a.srt', 'b.srt', 'c.srt'], {
      live: true,
      limit: 2,
      normalize: async (filePath) => {
        calls.push(filePath);
        return {
          filePath,
          action: filePath === 'a.srt' ? 'converted' : 'skipped',
          reason: 'test',
          sampleBefore: null,
          sampleAfter: null,
          backupPath: null,
        };
      },
    });
    expect(result).toEqual({ scanned: 2, converted: 1, wouldConvert: 0, skipped: 1 });
    expect(calls).toEqual(['a.srt', 'b.srt']);
  });
});

