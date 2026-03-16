import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

// ── Schemas ──────────────────────────────────────────────────────────────────

export const QualitySchema = z.object({
  resolution: z.enum(['480p', '720p', '1080p', '2160p']).optional(),
  source: z.string().optional(),
  codec: z.string().optional(),
});

export const ParsedReleaseSchema = z.object({
  title: z.string(),
  type: z.enum(['series', 'movie']),
  matchType: z.enum(['episode', 'season_pack', 'complete_series']),
  seasonNumber: z.number().optional(),
  episodeNumbers: z.array(z.number()).optional(),
  year: z.number().optional(),
  quality: QualitySchema.optional(),
});

export const ParsedReleaseWithScoreSchema = ParsedReleaseSchema.extend({
  relevanceScore: z.number().min(0).max(100),
});

export type ParsedRelease = z.infer<typeof ParsedReleaseSchema>;
export type ParsedReleaseWithScore = z.infer<typeof ParsedReleaseWithScoreSchema>;

export interface SearchContext {
  seriesTitle?: string;
  movieTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  preferredResolution?: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const SINGLE_TIMEOUT_MS = 10_000;
const BATCH_TIMEOUT_MS = 15_000;
const MAX_ATTEMPTS = 3;
const BACKOFF_DELAYS_MS = [1000, 2000];

const SERIES_PATTERNS = [
  /s?(?<season>\d{1,2})[ex](?<episode>\d{1,3})/i,
  /(?<season>\d{1,2})x(?<episode>\d{1,3})/i,
  /season\s+(?<season>\d{1,2})\s+episode\s+(?<episode>\d{1,3})/i,
];

// ── ReleaseParser ─────────────────────────────────────────────────────────────

export class ReleaseParser {
  /** Serial queue: each single parse() call appends and waits for the previous. */
  private queue: Promise<unknown> = Promise.resolve();

  private getModel() {
    const openai = createOpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: process.env.DEEPSEEK_API_KEY ?? '',
    });
    return openai('deepseek-chat');
  }

  /**
   * Parse a single release title. Returns a `ParsedRelease` or `null` on failure.
   * Falls back to regex when AI is disabled or returns null.
   * Calls are serialised to respect concurrency limits.
   */
  parse(title: string): Promise<ParsedRelease | null> {
    const next = this.queue.then(() => this._parseSingle(title));
    // Swallow tail rejections so a failure doesn't block subsequent calls.
    this.queue = next.catch(() => {});
    return next;
  }

  /**
   * Parse a batch of release titles in a single AI call.
   * Each result includes a `relevanceScore` (0–100).
   * Returns `[]` on any failure; never throws.
   */
  async parseBatch(titles: string[], context?: SearchContext): Promise<ParsedReleaseWithScore[]> {
    if (!process.env.DEEPSEEK_API_KEY || titles.length === 0) {
      return [];
    }

    const contextLines: string[] = [];
    if (context?.seriesTitle) contextLines.push(`Series: ${context.seriesTitle}`);
    if (context?.movieTitle) contextLines.push(`Movie: ${context.movieTitle}`);
    if (context?.seasonNumber != null) contextLines.push(`Season: ${context.seasonNumber}`);
    if (context?.episodeNumber != null) contextLines.push(`Episode: ${context.episodeNumber}`);
    if (context?.preferredResolution) contextLines.push(`Preferred resolution: ${context.preferredResolution}`);

    const contextBlock = contextLines.length > 0 ? `\nSearch context:\n${contextLines.join('\n')}\n` : '';

    const prompt = `You are a torrent release parser. Parse each release title and score its relevance to the search context.
${contextBlock}
Return a JSON array with one object per title (same order as input). Each object must have:
- title: string (cleaned series/movie name, no year, no release group)
- type: "series" | "movie"
- matchType: "episode" | "season_pack" | "complete_series"
- seasonNumber: number (if applicable)
- episodeNumbers: number[] (if applicable, empty array otherwise)
- year: number (disambiguation year only, e.g. Archer 2009)
- quality: { resolution?: "480p"|"720p"|"1080p"|"2160p", source?: string, codec?: string }
- relevanceScore: number 0–100 (how well this release matches the search context; season packs for the exact season score highest, complete series score medium, wrong season/episode score lowest)

Titles to parse:
${titles.map((t, i) => `${i + 1}. ${t}`).join('\n')}`;

    try {
      const { object } = await generateObject({
        model: this.getModel(),
        schema: z.array(ParsedReleaseWithScoreSchema),
        prompt,
        abortSignal: AbortSignal.timeout(BATCH_TIMEOUT_MS),
      });
      return object;
    } catch {
      return [];
    }
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private async _parseSingle(title: string): Promise<ParsedRelease | null> {
    if (!process.env.DEEPSEEK_API_KEY) {
      return this._regexFallback(title);
    }

    const prompt = `Parse this torrent/release title and return a JSON object with:
- title: string (cleaned series/movie name, no year, no release group)
- type: "series" | "movie"
- matchType: "episode" | "season_pack" | "complete_series"
- seasonNumber: number (if applicable)
- episodeNumbers: number[] (empty array if none)
- year: number (disambiguation year only, optional)
- quality: { resolution?: "480p"|"720p"|"1080p"|"2160p", source?: string, codec?: string }

Release title: ${title}`;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const { object } = await generateObject({
          model: this.getModel(),
          schema: ParsedReleaseSchema,
          prompt,
          abortSignal: AbortSignal.timeout(SINGLE_TIMEOUT_MS),
        });
        return object;
      } catch {
        if (attempt === MAX_ATTEMPTS - 1) {
          return this._regexFallback(title);
        }
        const delay = BACKOFF_DELAYS_MS[attempt] ?? BACKOFF_DELAYS_MS[BACKOFF_DELAYS_MS.length - 1]!;
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    return this._regexFallback(title);
  }

  /** Regex fallback — handles standard SxxExx patterns only. */
  private _regexFallback(title: string): ParsedRelease | null {
    for (const pattern of SERIES_PATTERNS) {
      const match = title.match(pattern);
      if (match?.groups) {
        const season = parseInt(match.groups.season!, 10);
        const episode = parseInt(match.groups.episode!, 10);
        const matchStr = match[0]!;
        const index = title.indexOf(matchStr);
        let seriesTitle = '';
        if (index > 0) {
          seriesTitle = title
            .substring(0, index)
            .replace(/[._\- ]+$/, '')
            .replace(/[._]/g, ' ')
            .trim();
        }
        return {
          title: seriesTitle || title,
          type: 'series',
          matchType: 'episode',
          seasonNumber: season,
          episodeNumbers: [episode],
        };
      }
    }
    return null;
  }
}

export const releaseParser = new ReleaseParser();
