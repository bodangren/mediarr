import type { Translator } from './MiniMaxTranslator';
import { parseJsonArray } from './MiniMaxTranslator';

interface XiaomiOptions {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  fetchImpl?: typeof fetch;
  chunkSize?: number;
  maxOutputTokens?: number;
}

const DEFAULT_BASE_URL = 'https://api.xiaomimimo.com/v1';
const DEFAULT_MODEL = 'mimo-v2.6-flash';
const DEFAULT_CHUNK = 40;

/**
 * Cheap-model translator (Xiaomi MiMo, OpenAI-compatible chat completions)
 * for English subtitle cues -> Simplified Chinese. Same strict JSON contract
 * as MiniMaxTranslator.
 */
export class XiaomiTranslator implements Translator {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly fetchImpl: typeof fetch;
  private readonly chunkSize: number;
  private readonly maxOutputTokens: number;

  constructor(options: XiaomiOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.XIAOMI_API_KEY ?? '';
    if (!this.apiKey) throw new Error('XiaomiTranslator: XIAOMI_API_KEY is not set');
    this.baseUrl = (options.baseUrl ?? process.env.XIAOMI_API_BASE ?? DEFAULT_BASE_URL).replace(/\/$/, '');
    this.model = options.model ?? process.env.XIAOMI_MODEL ?? DEFAULT_MODEL;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.chunkSize = options.chunkSize ?? DEFAULT_CHUNK;
    this.maxOutputTokens = options.maxOutputTokens ?? 8192;
  }

  async translate(cues: string[]): Promise<string[]> {
    const out: string[] = [];
    for (let start = 0; start < cues.length; start += this.chunkSize) {
      const chunk = cues.slice(start, start + this.chunkSize);
      out.push(...(await this.translateChunk(chunk)));
    }
    return out;
  }

  private async translateChunk(chunk: string[]): Promise<string[]> {
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.requestTranslations(chunk);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  private async requestTranslations(chunk: string[]): Promise<string[]> {
    const prompt =
      'Translate each English subtitle line into natural Simplified Chinese. '
      + 'Keep meaning, tone, and character names. Return ONLY a JSON array of strings in the same '
      + 'order as the input; no markdown, no commentary. If a line is only a bracketed sound effect, '
      + `copy it unchanged.\n\n${JSON.stringify(chunk)}`;
    const response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: this.maxOutputTokens,
        temperature: 0.2,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!response.ok) {
      throw new Error(`Xiaomi HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
    }
    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = body.choices?.[0]?.message?.content ?? '';
    const translated = parseJsonArray(text);
    if (translated.length !== chunk.length) {
      throw new Error(`Xiaomi returned ${translated.length} translations for ${chunk.length} cues`);
    }
    return translated;
  }
}
