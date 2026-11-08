import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { BilingualSubtitleService, parseSrt, formatSrt, classifyContent } from './BilingualSubtitleService';
import type { Translator } from './MiniMaxTranslator';

const ZH = '1\n00:00:01,000 --> 00:00:02,000\n你好。\n';
const EN = '1\n00:00:01,000 --> 00:00:02,000\nHello.\n';
const BILINGUAL = '1\n00:00:01,000 --> 00:00:02,000\n你好。\nHello.\n';

function fakeTranslator(map: Record<string, string>): Translator & { calls: number } {
  const translator = {
    calls: 0,
    async translate(cues: string[]): Promise<string[]> {
      translator.calls += 1;
      return cues.map(cue => map[cue] ?? `译:${cue}`);
    },
  };
  return translator;
}

describe('BilingualSubtitleService', () => {
  let dir: string;
  let statePath: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'bilingual-test-'));
    statePath = path.join(dir, 'state.json');
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  const write = async (name: string, content: string): Promise<string> => {
    const file = path.join(dir, name);
    await fs.writeFile(file, content);
    return file;
  };

  it('processes candidates in the provider order and stops at the limit', async () => {
    const first = await write('first.srt', EN);
    const second = await write('second.srt', EN);
    const translator = fakeTranslator({});
    const service = new BilingualSubtitleService({
      statePath,
      translator,
      candidates: async () => [second, first],
    });

    const result = await service.runCycle({ limit: 1 });

    const state = JSON.parse(await fs.readFile(statePath, 'utf-8')) as { entries: Record<string, unknown> };
    // Only the first candidate is merged; `scanned` also counts the candidate that hit the cap.
    expect(Object.keys(state.entries)).toEqual([second]);
    expect(result.scanned).toBe(2);
  });

  it('classifies bilingual, Chinese-only and English-only content', () => {
    expect(classifyContent(BILINGUAL)).toBe('bilingual');
    expect(classifyContent(ZH)).toBe('chinese_only');
    expect(classifyContent(EN)).toBe('english_only');
    expect(classifyContent('\n\n')).toBe('empty');
  });

  it('parses and rewrites SRT cues without losing timing', () => {
    const cues = parseSrt(BILINGUAL);
    expect(cues).toHaveLength(1);
    expect(cues[0]!.startMs).toBe(1000);
    expect(formatSrt(cues)).toBe(BILINGUAL);
  });

  it('leaves bilingual sidecars untouched', async () => {
    const file = await write('a.zho.srt', BILINGUAL);
    const service = new BilingualSubtitleService({ statePath, candidates: async () => [file] });
    const result = await service.runCycle();
    expect(result.bilingual).toBe(1);
    await expect(fs.readFile(file, 'utf-8')).resolves.toBe(BILINGUAL);
  });

  it('merges a Chinese-only sidecar with its English sibling', async () => {
    const file = await write('a.zho.srt', ZH);
    await write('a.en.srt', EN);
    const service = new BilingualSubtitleService({ statePath, candidates: async () => [file] });
    const result = await service.runCycle();
    expect(result.merged).toBe(1);
    await expect(fs.readFile(file, 'utf-8')).resolves.toBe(BILINGUAL);
    await expect(fs.readFile(file + '.orig', 'utf-8')).resolves.toBe(ZH);
  });

  it('flags a Chinese-only sidecar that has no English sibling', async () => {
    const file = await write('a.zho.srt', ZH);
    const service = new BilingualSubtitleService({ statePath, candidates: async () => [file] });
    const result = await service.runCycle();
    expect(result.flagged).toBe(1);
    await expect(fs.readFile(file, 'utf-8')).resolves.toBe(ZH);
  });

  it('translates an English-only sidecar into bilingual output', async () => {
    const file = await write('a.zho.srt', EN);
    const translator = fakeTranslator({ 'Hello.': '你好。' });
    const service = new BilingualSubtitleService({ statePath, candidates: async () => [file], translator });
    const result = await service.runCycle();
    expect(result.translated).toBe(1);
    expect(translator.calls).toBe(1);
    await expect(fs.readFile(file, 'utf-8')).resolves.toBe(BILINGUAL);
    await expect(fs.readFile(file + '.orig', 'utf-8')).resolves.toBe(EN);
  });

  it('is idempotent on rerun', async () => {
    const file = await write('a.zho.srt', EN);
    const translator = fakeTranslator({ 'Hello.': '你好。' });
    const service = new BilingualSubtitleService({ statePath, candidates: async () => [file], translator });
    await service.runCycle();
    const second = await service.runCycle();
    expect(second.bilingual).toBe(1);
    expect(translator.calls).toBe(1);
  });

  it('leaves the file untouched and records a failure when translation fails', async () => {
    const file = await write('a.zho.srt', EN);
    const translator: Translator = { translate: async () => { throw new Error('boom'); } };
    const service = new BilingualSubtitleService({ statePath, candidates: async () => [file], translator });
    const result = await service.runCycle();
    expect(result.failed).toBe(1);
    await expect(fs.readFile(file, 'utf-8')).resolves.toBe(EN);
  });

  it('honours the per-cycle limit', async () => {
    const first = await write('a.zho.srt', EN);
    const second = await write('b.zho.srt', EN);
    const translator = fakeTranslator({ 'Hello.': '你好。' });
    const service = new BilingualSubtitleService({ statePath, candidates: async () => [first, second], translator });
    const result = await service.runCycle({ limit: 1 });
    expect(result.translated).toBe(1);
    await expect(fs.readFile(second, 'utf-8')).resolves.toBe(EN);
  });
});
