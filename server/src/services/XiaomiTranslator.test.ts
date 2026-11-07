import { describe, expect, it, vi } from 'vitest';
import { XiaomiTranslator } from './XiaomiTranslator';
import { FallbackTranslator } from './FallbackTranslator';

function response(body: unknown, ok = true, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function translatorWith(fetchImpl: typeof fetch, chunkSize = 2): XiaomiTranslator {
  return new XiaomiTranslator({ apiKey: 'test-key', fetchImpl, chunkSize });
}

describe('XiaomiTranslator', () => {
  it('batches cues and returns translations in order', async () => {
    const calls: string[][] = [];
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      const cues: string[] = JSON.parse(body.messages[0].content.split('\n\n').pop()!);
      calls.push(cues);
      return response({ choices: [{ message: { content: JSON.stringify(cues.map(c => `中:${c}`)) } }] });
    });
    const translator = translatorWith(fetchImpl as unknown as typeof fetch, 2);

    await expect(translator.translate(['a', 'b', 'c'])).resolves.toEqual(['中:a', '中:b', '中:c']);
    expect(calls).toEqual([['a', 'b'], ['c']]);
  });

  it('retries transient failures', async () => {
    let attempt = 0;
    const fetchImpl = vi.fn(async () => {
      attempt += 1;
      return attempt === 1
        ? response({ error: 'busy' }, false, 429)
        : response({ choices: [{ message: { content: '["你好"]' } }] });
    });
    const translator = translatorWith(fetchImpl as unknown as typeof fetch, 1);

    await expect(translator.translate(['hello'])).resolves.toEqual(['你好']);
    expect(attempt).toBe(2);
  });

  it('rejects a mismatched answer', async () => {
    const fetchImpl = vi.fn(async () => response({ choices: [{ message: { content: '["only"]' } }] }));
    const translator = translatorWith(fetchImpl as unknown as typeof fetch, 2);
    await expect(translator.translate(['a', 'b'])).rejects.toThrow(/translations for/);
  });
});

describe('FallbackTranslator', () => {
  it('uses the next provider when the first fails', async () => {
    const failing = { translate: async () => { throw new Error('capped'); } };
    const working = { translate: async (cues: string[]) => cues.map(c => `中:${c}`) };
    const fallback = new FallbackTranslator([failing, working]);
    await expect(fallback.translate(['hi'])).resolves.toEqual(['中:hi']);
  });

  it('throws when every provider fails', async () => {
    const failing = { translate: async () => { throw new Error('capped'); } };
    const fallback = new FallbackTranslator([failing, failing]);
    await expect(fallback.translate(['hi'])).rejects.toThrow(/all translators failed/);
  });
});
