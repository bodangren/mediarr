import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Translator } from './MiniMaxTranslator';

export interface SubtitleCue {
  startMs: number;
  endMs: number;
  text: string;
}

export type Classification = 'bilingual' | 'chinese_only' | 'english_only' | 'empty';

export interface BilingualEntry {
  status: 'ok' | 'merged' | 'translated' | 'needs_english' | 'needs_translation' | 'empty' | 'failed' | 'gave_up';
  hash?: string;
  classification?: Classification;
  attempts: number;
  updatedAt?: string;
  notes?: string;
}

interface BilingualState {
  version: 1;
  entries: Record<string, BilingualEntry>;
}

export interface BilingualCycleResult {
  scanned: number;
  bilingual: number;
  merged: number;
  translated: number;
  flagged: number;
  failed: number;
}

export interface BilingualOptions {
  statePath: string;
  candidates: () => Promise<string[]>;
  translator?: Translator | null;
  limit?: number;
  maxAttempts?: number;
  now?: () => Date;
}

const CJK = /[\u4e00-\u9fff]/;
const LATIN_WORD = /[A-Za-z]{3,}/;
const TIMING = /^(\d{1,2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{1,2}):(\d{2}):(\d{2})[,.](\d{3})/;
const CUE_MATCH_TOLERANCE_MS = 700;
const DEFAULT_LIMIT = 5;

export function parseSrt(content: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  const blocks = content.replace(/\r\n/g, '\n').split(/\n{2,}/);
  for (const block of blocks) {
    const lines = block.split('\n').map(line => line.trimEnd());
    const timingIndex = lines.findIndex(line => TIMING.test(line.trim()));
    if (timingIndex < 0) continue;
    const match = TIMING.exec(lines[timingIndex]!.trim());
    if (!match) continue;
    const startMs = toMs(match[1]!, match[2]!, match[3]!, match[4]!);
    const endMs = toMs(match[5]!, match[6]!, match[7]!, match[8]!);
    const text = lines.slice(timingIndex + 1).join('\n').trim();
    if (text) cues.push({ startMs, endMs, text });
  }
  return cues;
}

function toMs(h: string, m: string, s: string, ms: string): number {
  return ((Number(h) * 60 + Number(m)) * 60 + Number(s)) * 1000 + Number(ms);
}

export function formatSrt(cues: SubtitleCue[]): string {
  return cues
    .map((cue, index) => `${index + 1}\n${formatTime(cue.startMs)} --> ${formatTime(cue.endMs)}\n${cue.text}`)
    .join('\n\n') + '\n';
}

function formatTime(ms: number): string {
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  const millis = ms % 1000;
  const pad = (value: number, width = 2): string => String(value).padStart(width, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(millis, 3)}`;
}

export function classifyContent(content: string): Classification {
  const hasCjk = CJK.test(content);
  const hasLatin = LATIN_WORD.test(content);
  if (hasCjk && hasLatin) return 'bilingual';
  if (hasCjk) return 'chinese_only';
  if (hasLatin) return 'english_only';
  return 'empty';
}

function isBilingual(cue: SubtitleCue): boolean {
  return CJK.test(cue.text) && LATIN_WORD.test(cue.text);
}

/**
 * Enforces the bilingual EN+ZH subtitle invariant.
 *
 * - bilingual -> untouched (marked ok)
 * - Chinese-only + English sibling -> deterministic timing merge
 * - English-only -> cheap-model translation, then merge (Chinese line + English line)
 * - Chinese-only without English -> flagged `needs_english` (never guessed)
 *
 * Writes are atomic with a one-time `.orig` backup; a content-hash ledger makes
 * reruns idempotent. A per-cycle limit bounds model spend.
 */
export class BilingualSubtitleService {
  private readonly statePath: string;
  private readonly candidates: () => Promise<string[]>;
  private readonly translator: Translator | null;
  private readonly limit: number;
  private readonly maxAttempts: number;
  private readonly now: () => Date;

  constructor(options: BilingualOptions) {
    this.statePath = options.statePath;
    this.candidates = options.candidates;
    this.translator = options.translator ?? null;
    this.limit = options.limit ?? DEFAULT_LIMIT;
    this.maxAttempts = options.maxAttempts ?? 3;
    this.now = options.now ?? (() => new Date());
  }

  async runCycle(options: { limit?: number } = {}): Promise<BilingualCycleResult> {
    const limit = options.limit ?? this.limit;
    const state = await this.loadState();
    const result: BilingualCycleResult = {
      scanned: 0, bilingual: 0, merged: 0, translated: 0, flagged: 0, failed: 0,
    };

    for (const srtPath of await this.candidates()) {
      result.scanned += 1;
      const entry = state.entries[srtPath];
      let content: string;
      try {
        content = await fs.readFile(srtPath, 'utf-8');
      } catch {
        continue;
      }
      const hash = createHash('sha256').update(content).digest('hex');
      if (entry && entry.hash === hash && ['ok', 'merged', 'translated', 'empty', 'gave_up'].includes(entry.status)) {
        if (entry.status === 'ok' || entry.status === 'merged' || entry.status === 'translated') {
          result.bilingual += 1;
        }
        continue;
      }
      if (result.merged + result.translated + result.failed >= limit) break;

      const classification = classifyContent(content);
      const cues = parseSrt(content);
      if (classification === 'bilingual' || (cues.length > 0 && cues.every(isBilingual))) {
        result.bilingual += 1;
        state.entries[srtPath] = { status: 'ok', hash, classification: 'bilingual', attempts: 1, updatedAt: this.now().toISOString() };
        continue;
      }
      if (classification === 'empty') {
        state.entries[srtPath] = { status: 'empty', hash, classification, attempts: 1, updatedAt: this.now().toISOString() };
        continue;
      }

      const outcome = await this.completeOne(srtPath, content, hash, classification, cues, entry, state);
      if (outcome === 'merged') result.merged += 1;
      else if (outcome === 'translated') result.translated += 1;
      else if (outcome === 'flagged') result.flagged += 1;
      else if (outcome === 'failed') result.failed += 1;
    }

    await this.saveState(state);
    return result;
  }

  private async completeOne(
    srtPath: string,
    content: string,
    hash: string,
    classification: Classification,
    cues: SubtitleCue[],
    previous: BilingualEntry | undefined,
    state: BilingualState,
  ): Promise<'merged' | 'translated' | 'flagged' | 'failed'> {
    const attempts = (previous?.attempts ?? 0) + 1;
    const fail = async (error: unknown): Promise<'failed'> => {
      state.entries[srtPath] = {
        status: attempts >= this.maxAttempts ? 'gave_up' : 'failed',
        hash, classification, attempts,
        updatedAt: this.now().toISOString(),
        notes: error instanceof Error ? error.message : String(error),
      };
      return 'failed';
    };
    const flag = (status: 'needs_english' | 'needs_translation', notes: string): 'flagged' => {
      state.entries[srtPath] = { status, hash, classification, attempts, updatedAt: this.now().toISOString(), notes };
      return 'flagged';
    };

    try {
      if (classification === 'chinese_only') {
        const englishPath = await this.findEnglishSibling(srtPath);
        if (!englishPath) return flag('needs_english', 'no English sibling sidecar');
        const englishCues = parseSrt(await fs.readFile(englishPath, 'utf-8'));
        if (englishCues.length === 0) return flag('needs_english', 'English sibling has no cues');
        await this.writeBilingual(srtPath, content, cues.map(cue => mergeCue(cue, englishCues)), attempts, hash, classification, 'merged', state);
        return 'merged';
      }

      // english_only
      if (!this.translator) return flag('needs_translation', 'no translator configured');
      const translatableIndexes: number[] = [];
      const translatable: string[] = [];
      cues.forEach((cue, index) => {
        if (LATIN_WORD.test(cue.text)) {
          translatableIndexes.push(index);
          translatable.push(cue.text.replace(/\n/g, ' ').trim());
        }
      });
      const translations = await this.translator.translate(translatable);
      const chineseByIndex = new Map<number, string>();
      translatableIndexes.forEach((cueIndex, i) => chineseByIndex.set(cueIndex, translations[i] ?? ''));
      const bilingualCues = cues.map((cue, index) => {
        const chinese = chineseByIndex.get(index);
        return chinese ? { ...cue, text: `${chinese}\n${cue.text}` } : cue;
      });
      await this.writeBilingual(srtPath, content, bilingualCues, attempts, hash, classification, 'translated', state);
      return 'translated';
    } catch (error) {
      return fail(error);
    }
  }

  private async writeBilingual(
    srtPath: string,
    originalContent: string,
    cues: SubtitleCue[],
    attempts: number,
    sourceHash: string,
    classification: Classification,
    status: 'merged' | 'translated',
    state: BilingualState,
  ): Promise<void> {
    const next = formatSrt(cues);
    if (!(await this.exists(`${srtPath}.orig`))) {
      await fs.copyFile(srtPath, `${srtPath}.orig`);
    }
    const tmp = `${srtPath}.bilingual.tmp`;
    await fs.writeFile(tmp, next, 'utf-8');
    await fs.rename(tmp, srtPath);
    state.entries[srtPath] = {
      status,
      hash: createHash('sha256').update(next).digest('hex'),
      classification,
      attempts,
      updatedAt: this.now().toISOString(),
      notes: `source ${sourceHash.slice(0, 12)} -> bilingual`,
    };
  }

  private async findEnglishSibling(srtPath: string): Promise<string | null> {
    const base = srtPath.replace(/\.(zho|zh)\.srt$/i, '');
    for (const suffix of ['.en.srt', '.eng.srt', '.en-US.srt', '.english.srt', '.en.forced.srt']) {
      const candidate = base + suffix;
      if (await this.exists(candidate)) return candidate;
    }
    return null;
  }

  private async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async loadState(): Promise<BilingualState> {
    try {
      const parsed = JSON.parse(await fs.readFile(this.statePath, 'utf-8')) as BilingualState;
      if (parsed.version === 1 && typeof parsed.entries === 'object' && parsed.entries !== null) {
        return parsed;
      }
    } catch {
      /* first run */
    }
    return { version: 1, entries: {} };
  }

  private async saveState(state: BilingualState): Promise<void> {
    await fs.mkdir(path.dirname(this.statePath), { recursive: true });
    const tmp = `${this.statePath}.tmp`;
    await fs.writeFile(tmp, `${JSON.stringify(state, null, 2)}\n`, 'utf-8');
    await fs.rename(tmp, this.statePath);
  }
}

function mergeCue(chinese: SubtitleCue, englishCues: SubtitleCue[]): SubtitleCue {
  let best: SubtitleCue | undefined;
  let bestDelta = Number.POSITIVE_INFINITY;
  for (const english of englishCues) {
    const delta = Math.abs(english.startMs - chinese.startMs);
    if (delta <= CUE_MATCH_TOLERANCE_MS && delta < bestDelta) {
      best = english;
      bestDelta = delta;
    }
  }
  if (!best || best.text.trim() === chinese.text.trim()) return chinese;
  return { ...chinese, text: `${chinese.text}\n${best.text}` };
}
