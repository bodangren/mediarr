import { describe, expect, it } from 'vitest';
import { auditSubtitles, classifySubtitleBytes, classifySubtitleText } from './SubtitleAuditService';

const utf8 = (text: string) => new TextEncoder().encode(text);

describe('classifySubtitleText', () => {
  it('detects simplified vs traditional Chinese', () => {
    expect(classifySubtitleText('我们需要专注在问题上，史塔克先生').chineseVariant).toBe('simplified');
    expect(classifySubtitleText('你們沒有那些東西？').chineseVariant).toBe('traditional');
  });

  it('flags mixed scripts and reports English presence', () => {
    expect(classifySubtitleText('你們 need 专注').chineseVariant).toBe('mixed');
    expect(classifySubtitleText('I never felt the sun on my face').hasLatinText).toBe(true);
    expect(classifySubtitleText('我从未感受过阳光照在我脸上').hasLatinText).toBe(false);
  });

  it('reports no Chinese for English-only text', () => {
    expect(classifySubtitleText('Hello there').chineseVariant).toBe('none');
  });
});

describe('classifySubtitleBytes', () => {
  it('flags bytes that are not valid UTF-8', () => {
    // 0xB0 0xA1 is GBK "啊" and invalid as UTF-8.
    expect(classifySubtitleBytes(new Uint8Array([0xB0, 0xA1])).validUtf8).toBe(false);
    expect(classifySubtitleBytes(utf8('1\n00:00:01,000 --> 00:00:02,000\nHello')).validUtf8).toBe(true);
  });
});

describe('auditSubtitles', () => {
  it('classifies encodings and variants and reports missing files', async () => {
    const files: Record<string, Uint8Array> = {
      '/s/en.srt': utf8('Hello there'),
      '/s/zho-trad.srt': utf8('你們沒有那些東西？'),
      '/s/zho-simp.srt': utf8('我们需要专注在问题上'),
      '/s/gbk.srt': new Uint8Array([0xB0, 0xA1, 0xB2, 0xBB]),
    };
    const summary = await auditSubtitles(
      [
        { filePath: '/s/en.srt', languageCode: 'en' },
        { filePath: '/s/zho-trad.srt', languageCode: 'zho' },
        { filePath: '/s/zho-simp.srt', languageCode: 'zho' },
        { filePath: '/s/gbk.srt', languageCode: 'zho' },
        { filePath: '/s/missing.srt', languageCode: 'zho' },
        { filePath: '', languageCode: 'zho' },
      ],
      { readFile: async (file) => {
        const data = files[file];
        if (data === undefined) throw new Error('ENOENT');
        return data;
      } },
    );

    expect(summary).toMatchObject({
      scanned: 5, emptyPath: 1, nonUtf8: 1, traditional: 1, mixed: 0, missingFiles: 1, chineseFiles: 2,
    });
    expect(summary.issues.map((issue) => issue.problem)).toEqual(
      expect.arrayContaining(['non-utf8', 'traditional-chinese', 'missing-file']),
    );
  });
});
