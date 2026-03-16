import { deepseek } from '@ai-sdk/deepseek';
import { openai } from '@ai-sdk/openai';
import { generateText, Output } from 'ai';
import { z } from 'zod';

// ── Schemas ──────────────────────────────────────────────────────────────────

export const QualitySchema = z.object({
  resolution: z
    .enum(['SD', '480p', '720p', '1080p', 'unknown'])
    .describe(
      'Pixel resolution of the video. ' +
      '"SD" when the title has no explicit resolution tag and no HD/UHD marker (standard definition, ~480i/576i). ' +
      '"480p" when the title explicitly states 480p. ' +
      '"720p" when the title explicitly states 720p or HD. ' +
      '"1080p" when the title explicitly states 1080p or Full HD. ' +
      '"unknown" when the title states 4K, UHD, 2160p, or any resolution that is not in this list.',
    )
    .optional()
    .catch(undefined),
  source: z
    .enum(['BluRay', 'WEB-DL', 'WEBRip', 'HDTV', 'PDTV', 'DVDRip', 'DVD', 'REMUX', 'AMZN', 'NF', 'HULU', 'DSNP', 'ATVP', 'other'])
    .describe('Distribution medium. Use "other" for any source not in this list.')
    .optional()
    .catch(undefined),
  codec: z
    .enum(['x264', 'x265', 'HEVC', 'AVC', 'XviD', 'DivX', 'AV1', 'VP9', 'other'])
    .describe('Video codec. Use "other" for any codec not in this list.')
    .optional()
    .catch(undefined),
});

export const ParsedReleaseSchema = z.object({
  title: z
    .string()
    .describe('Cleaned series or movie name only — no year, no resolution, no release group, no codec info'),
  type: z
    .enum(['series', 'movie'])
    .describe('"series" for TV shows and anime; "movie" for films')
    .catch('series'),
  matchType: z
    .enum(['episode', 'season_pack', 'complete_series'])
    .describe(
      '"episode" for a single episode file. ' +
      '"season_pack" for a full season of a TV series. ' +
      '"complete_series" for all seasons of a TV series OR for a single movie file.',
    )
    .catch('episode'),
  seasonNumber: z
    .number()
    .describe('Season number for episodes or season packs. Omit for movies or complete series.')
    .optional()
    .catch(undefined),
  episodeNumbers: z
    .array(z.number())
    .describe(
      'Episode numbers for single or multi-episode files. ' +
      'Empty array for season packs, complete series, and movies.',
    )
    .optional()
    .catch(undefined),
  year: z
    .number()
    .describe(
      'Disambiguation year when it is part of the title (e.g. Archer 2009, Doctor Who 2005). ' +
      'Omit if the year is not needed to identify the title.',
    )
    .optional()
    .catch(undefined),
  quality: QualitySchema
    .describe('Video quality metadata extracted from the release title')
    .optional()
    .catch(undefined),
});

export const ParsedReleaseWithScoreSchema = ParsedReleaseSchema.extend({
  relevanceScore: z
    .number()
    .min(0)
    .max(100)
    .describe(
      'Relevance score 0–100 relative to the search context. ' +
      '90–100: exact season pack match. 70–89: correct season episodes or UHD pack. ' +
      '50–69: complete series or adjacent season. 0–49: wrong season, wrong show, or poor quality match.',
    )
    .catch(50),
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

const SINGLE_TIMEOUT_MS = 30_000;
const BATCH_TIMEOUT_MS = 90_000;
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
    if (!process.env.OPENAI_API_KEY || titles.length === 0) {
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
Return a JSON object with a "results" array — one entry per title, same order as input. Each entry:
- title: cleaned name only (no year, no release group, no codec, no resolution)
- type: "series" | "movie"
- matchType: "episode" | "season_pack" | "complete_series" (use "complete_series" for single movie files)
- seasonNumber: number if applicable
- episodeNumbers: number[] (empty array for season packs, complete series, movies)
- year: disambiguation year only if part of the title (e.g. Archer 2009)
- quality.resolution: "SD"|"480p"|"720p"|"1080p"|"unknown" — use "SD" when no explicit resolution tag and no HD marker, "unknown" for 4K/UHD/2160p
- quality.source: BluRay|WEB-DL|WEBRip|HDTV|DVDRip|REMUX|other
- quality.codec: x264|x265|HEVC|AVC|XviD|other
- relevanceScore: 0–100 (exact season pack = 90–100, complete series = 50–69, wrong season = 0–49)

Titles to parse:
${titles.map((t, i) => `${i + 1}. ${t}`).join('\n')}`;

    try {
      const { output } = await generateText({
        model: openai('gpt-5-nano'),
        output: Output.object({
          schema: z.object({
          results: z.array(ParsedReleaseWithScoreSchema).describe('One entry per input title, in the same order.'),
        }),
        }),
        prompt,
        abortSignal: AbortSignal.timeout(BATCH_TIMEOUT_MS),
      });
      return output.results;
    } catch {
      return [];
    }
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private async _parseSingle(title: string): Promise<ParsedRelease | null> {
    if (!process.env.DEEPSEEK_API_KEY) {
      return this._regexFallback(title);
    }

    const prompt = `Parse this torrent/release title into a JSON object.
- title: cleaned name only (no year, release group, codec, resolution)
- type: "series" | "movie"
- matchType: "episode" | "season_pack" | "complete_series" (use "complete_series" for a movie file)
- seasonNumber: number if applicable
- episodeNumbers: number[] (empty array for season packs, movies)
- year: disambiguation year only if part of the title (e.g. Archer 2009)
- quality.resolution: "SD"|"480p"|"720p"|"1080p"|"unknown" — use "SD" when no explicit resolution tag and no HD marker, "unknown" for 4K/UHD/2160p
- quality.source: BluRay|WEB-DL|WEBRip|HDTV|DVDRip|REMUX|other
- quality.codec: x264|x265|HEVC|AVC|XviD|other

Release title: ${title}`;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const { output } = await generateText({
          model: deepseek('deepseek-chat'),
          output: Output.object({ schema: ParsedReleaseSchema }),
          prompt,
          abortSignal: AbortSignal.timeout(SINGLE_TIMEOUT_MS),
        });
        return output;
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
