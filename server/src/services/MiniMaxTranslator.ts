export interface Translator {
  translate(cues: string[]): Promise<string[]>;
}

interface MiniMaxOptions {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  fetchImpl?: typeof fetch;
  chunkSize?: number;
  maxOutputTokens?: number;
}

const DEFAULT_BASE_URL = 'https://api.minimaxi.com/anthropic';
const DEFAULT_MODEL = 'MiniMax-M3.1-Flash';
const DEFAULT_CHUNK = 40;

/**
 * Cheap-model translator for English subtitle cues -> Simplified Chinese.
 * Uses MiniMax's Anthropic-compatible endpoint (M3.1 Flash) and a strict JSON
 * array contract so a malformed answer is a retry/failure, never silent garbage.
 */
export class MiniMaxTranslator implements Translator {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly fetchImpl: typeof fetch;
  private readonly chunkSize: number;
  private readonly maxOutputTokens: number;

  constructor(options: MiniMaxOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.MINIMAX_API_KEY ?? '';
    if (!this.apiKey) throw new Error('MiniMaxTranslator: MINIMAX_API_KEY is not set');
    this.baseUrl = (options.baseUrl ?? process.env.MINIMAX_API_BASE ?? DEFAULT_BASE_URL).replace(/\/$/, '');
    this.model = options.model ?? process.env.MINIMAX_MODEL ?? DEFAULT_MODEL;
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
    const response = await this.fetchImpl(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: this.maxOutputTokens,
        temperature: 0.2,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!response.ok) {
      throw new Error(`MiniMax HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
    }
    const body = (await response.json()) as {
      content?: Array<{ type?: string; text?: string; thinking?: string }>;
    };
    const text = (body.content ?? [])
      .filter(block => block.type === 'text' && typeof block.text === 'string')
      .map(block => block.text)
      .join('\n');
    const translated = parseJsonArray(text);
    if (translated.length !== chunk.length) {
      throw new Error(`MiniMax returned ${translated.length} translations for ${chunk.length} cues`);
    }
    return translated;
  }
}

export function parseJsonArray(text: string): string[] {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = /\[[\s\S]*\]/.exec(cleaned);
    if (!match) throw new Error('MiniMax returned no JSON array');
    parsed = JSON.parse(match[0]);
  }
  if (!Array.isArray(parsed) || parsed.some(item => typeof item !== 'string')) {
    throw new Error('MiniMax returned a non-string JSON array');
  }
  return parsed as string[];
}
