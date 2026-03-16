import OpenAI from 'openai';

const BACKOFF_DELAYS_MS = [1000, 2000];
const MAX_ATTEMPTS = 3;
const TIMEOUT_MS = 10_000;

/**
 * Singleton wrapper around an OpenAI-compatible client (Z.AI / GLM).
 * Calls the model with a system + user prompt, expects JSON back.
 * Returns null on any failure (network, timeout, bad JSON, missing fields).
 *
 * glm-4.7-flash has a concurrency limit of 1, so all calls are serialised
 * through a promise chain to avoid 429 errors.
 */
export class AiParsingService {
  private readonly client: OpenAI;
  // Serial queue: each call appends itself and waits for the previous to finish.
  private queue: Promise<unknown> = Promise.resolve();

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.GLM_API_KEY ?? '',
      baseURL: 'https://api.z.ai/api/paas/v4/',
    });
  }

  /**
   * Call the AI model and parse the response as JSON of type T.
   * Calls are serialised to respect the model's concurrency limit of 1.
   * @param systemPrompt  Instructions for the model.
   * @param userPrompt    The input (e.g. the filename).
   * @param requiredFields  Field names that must be present in the parsed result.
   */
  parse<T>(
    systemPrompt: string,
    userPrompt: string,
    requiredFields: string[] = []
  ): Promise<T | null> {
    const next = this.queue.then(() => this._parse<T>(systemPrompt, userPrompt, requiredFields));
    // Swallow rejections on the chain tail so a failure doesn't block subsequent calls.
    this.queue = next.catch(() => {});
    return next;
  }

  private async _parse<T>(
    systemPrompt: string,
    userPrompt: string,
    requiredFields: string[]
  ): Promise<T | null> {
    // Skip AI entirely when no API key is configured (e.g. tests, local dev without key).
    if (!process.env.GLM_API_KEY) {
      return null;
    }
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const response = await this.client.chat.completions.create(
          {
            model: 'glm-4.7-flash',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
          },
          { signal: AbortSignal.timeout(TIMEOUT_MS) }
        );

        const content = response.choices[0]?.message?.content;
        if (!content) {
          return null;
        }

        const parsed = this.parseJson<T>(content);
        if (!parsed) {
          return null;
        }

        for (const field of requiredFields) {
          if (!(field in (parsed as object))) {
            return null;
          }
        }

        return parsed;
      } catch (err) {
        const isLastAttempt = attempt === MAX_ATTEMPTS - 1;
        if (isLastAttempt) {
          return null;
        }
        const delay = BACKOFF_DELAYS_MS[attempt] ?? BACKOFF_DELAYS_MS[BACKOFF_DELAYS_MS.length - 1]!;
        await this.sleep(delay);
      }
    }

    return null;
  }

  private parseJson<T>(content: string): T | null {
    // Strip markdown code fences if present
    const stripped = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    try {
      return JSON.parse(stripped) as T;
    } catch {
      return null;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const aiParsingService = new AiParsingService();
