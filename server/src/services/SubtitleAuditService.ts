import fsp from 'node:fs/promises';

/**
 * Subtitle health audit (owner request 2026-11-08: traditional-Chinese and mis-encoded subtitles).
 *
 * Classifies every subtitle file the library knows about into encoding and Chinese-script problems so
 * a fix can be applied per-file with approval, instead of mass-converting the whole library.
 */

const TRADITIONAL_CHARS = '們這為國學說會個來時對開關應該讓還機後點裡嗎麼樣當經過發覺電動網路車隊實際經濟體驗讀寫聽講話語詞彙歡迎專門車語詞';
const SIMPLIFIED_CHARS = '们这为国学说会个来时对开关应该让还机后点里吗么样当经过发觉电动网络车队实际经济体验读写听讲话语词汇欢迎专门车语词';

export type ChineseVariant = 'simplified' | 'traditional' | 'mixed' | 'none';

export interface SubtitleClassification {
  validUtf8: boolean;
  chineseVariant: ChineseVariant;
  /** Rough English presence: ASCII-letter share of non-space characters. */
  hasLatinText: boolean;
}

export function classifySubtitleText(text: string): SubtitleClassification {
  let traditional = 0;
  let simplified = 0;
  for (const char of text) {
    if (TRADITIONAL_CHARS.includes(char)) traditional += 1;
    else if (SIMPLIFIED_CHARS.includes(char)) simplified += 1;
  }

  let chineseVariant: ChineseVariant = 'none';
  if (traditional + simplified > 0) {
    if (traditional > 0 && simplified > 0 && Math.min(traditional, simplified) / Math.max(traditional, simplified) > 0.25) {
      chineseVariant = 'mixed';
    } else {
      chineseVariant = traditional > simplified ? 'traditional' : 'simplified';
    }
  }

  const letters = text.replace(/[^A-Za-z]/g, '').length;
  const nonSpace = text.replace(/\s/g, '').length;
  return {
    validUtf8: true,
    chineseVariant,
    hasLatinText: nonSpace > 0 && letters / nonSpace > 0.25,
  };
}

/** Decodes UTF-8 strictly; invalid bytes mean the file is not UTF-8 (GBK/Big5/Latin-1 today). */
export function classifySubtitleBytes(bytes: Uint8Array): SubtitleClassification {
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return { validUtf8: false, chineseVariant: 'none', hasLatinText: false };
  }
  return classifySubtitleText(text);
}

export interface SubtitleRow {
  filePath: string | null;
  languageCode: string | null;
}

export interface SubtitleIssue {
  filePath: string;
  languageCode: string | null;
  problem: 'non-utf8' | 'traditional-chinese' | 'mixed-chinese' | 'missing-file';
}

export interface SubtitleAuditSummary {
  scanned: number;
  emptyPath: number;
  nonUtf8: number;
  traditional: number;
  mixed: number;
  missingFiles: number;
  chineseFiles: number;
  issues: SubtitleIssue[];
}

/**
 * Classifies up to [limit] known subtitle files. The issues list is the actionable output; counts
 * describe the whole scanned set so the owner can decide whether to convert, re-download, or delete.
 */
export async function auditSubtitles(
  rows: readonly SubtitleRow[],
  options: { limit?: number; readFile?: (file: string) => Promise<Uint8Array> } = {},
): Promise<SubtitleAuditSummary> {
  const limit = Math.max(1, Math.min(5000, options.limit ?? 500));
  const readFile = options.readFile ?? ((file: string) => fsp.readFile(file));
  const summary: SubtitleAuditSummary = {
    scanned: 0, emptyPath: 0, nonUtf8: 0, traditional: 0, mixed: 0, missingFiles: 0, chineseFiles: 0, issues: [],
  };

  for (const row of rows.slice(0, limit)) {
    if (row.filePath === null || row.filePath.length === 0) {
      summary.emptyPath += 1;
      continue;
    }
    summary.scanned += 1;
    let bytes: Uint8Array;
    try {
      bytes = await readFile(row.filePath);
    } catch {
      summary.missingFiles += 1;
      summary.issues.push({ filePath: row.filePath, languageCode: row.languageCode, problem: 'missing-file' });
      continue;
    }

    const classification = classifySubtitleBytes(bytes);
    const chineseLanguage = (row.languageCode ?? '').toLowerCase();
    const isChineseLanguage = ['zho', 'chi', 'zh', 'cmn'].includes(chineseLanguage);
    if (!classification.validUtf8) {
      summary.nonUtf8 += 1;
      summary.issues.push({ filePath: row.filePath, languageCode: row.languageCode, problem: 'non-utf8' });
      continue;
    }
    if (classification.chineseVariant !== 'none') {
      summary.chineseFiles += 1;
      if (classification.chineseVariant === 'traditional' && isChineseLanguage) {
        summary.traditional += 1;
        summary.issues.push({ filePath: row.filePath, languageCode: row.languageCode, problem: 'traditional-chinese' });
      } else if (classification.chineseVariant === 'mixed') {
        summary.mixed += 1;
        summary.issues.push({ filePath: row.filePath, languageCode: row.languageCode, problem: 'mixed-chinese' });
      }
    }
  }

  return summary;
}
