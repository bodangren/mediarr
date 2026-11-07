import { describe, expect, it, vi } from 'vitest';
import { MiniMaxTranslator } from './MiniMaxTranslator';

function response(body: unknown, ok = true, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function translatorWith(fetchImpl: typeof fetch, chunkSize = 2): MiniMaxTranslator {
  return new MiniMaxTranslator({ apiKey: 'test-key', fetchImpl, chunkSize });
}

describe('MiniMaxTranslator', () => {
  it('batches cues and returns translations in order', async () => {
    const calls: string[][] = [];
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      const cues: string[] = JSON.parse(body.messages[0].content.split('\n\n').pop()!);
      calls.push(cues);
      return response({ content: [{ type: 'text', text: JSON.stringify(cues.map(c => `中:${c}`)) }] });
    });
    const translator = translatorWith(fetchImpl as unknown as typeof fetch, 2);

    const result = await translator.translate(['a', 'b', 'c']);

    expect(result).toEqual(['中:a', '中:b', '中:c']);
    expect(calls).toEqual([['a', 'b'], ['c']]);
  });

  it('retries a transient failure', async () => {
    let attempt = 0;
    const fetchImpl = vi.fn(async () => {
      attempt += 1;
      return attempt === 1 ? response({ error: 'busy' }, false, 503) : response({ content: [{ type: 'text', text: '["你好"]' }] });
    });
    const translator = translatorWith(fetchImpl as unknown as typeof fetch, 1);

    await expect(translator.translate(['hello'])).resolves.toEqual(['你好']);
    expect(attempt).toBe(2);
  });

  it('parses fenced JSON and ignores reasoning blocks', async () => {
    const fetchImpl = vi.fn(async () =>
      response({ content: [{ type: 'thinking', thinking: 'ignore me' }, { type: 'text', text: '```json\n["你好"]\n```' }] }));
    const translator = translatorWith(fetchImpl as unknown as typeof fetch, 1);

    await expect(translator.translate(['hello'])).resolves.toEqual(['你好']);
  });

  it('fails when the answer is not a matching JSON array', async () => {
    const fetchImpl = vi.fn(async () => response({ content: [{ type: 'text', text: '["only one"]' }] }));
    const translator = translatorWith(fetchImpl as unknown as typeof fetch, 2);

    await expect(translator.translate(['a', 'b'])).rejects.toThrow(/translations for/);
  });

  it('fails without an API key', () => {
    expect(() => new MiniMaxTranslator({ apiKey: '' })).toThrow(/API_KEY/);
  });
});
