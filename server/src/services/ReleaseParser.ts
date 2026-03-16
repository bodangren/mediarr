import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';

// ── Schemas ─────────────────────────────────────────────────────────────────

export const QualitySchema = z.object({
  resolution: z
    .enum(['SD', '480p', '720p', '1080p', 'unknown'])
    .describe(
      '"SD" = no explicit resolution and no HD/UHD marker. "480p"|"720p"|"1080p" = title explicitly states that resolution. "unknown" = 4K, UHD, 2160p, or any resolution not in this list.',
    )
    .nullable()
    .catch(null),
  source: z
    .enum([
      'BluRay', 'WEB-DL', 'WEBRip', 'HDTV', 'PDTV', 'DVDRip', 'DVD',
      'REMUX', 'AMZN', 'NF', 'HULU', 'DSNP', 'ATVP', 'other',
    ])
    .describe('Distribution medium. "other" for anything not in this list.')
    .nullable()
    .catch(null),
  codec: z
    .enum(['x264', 'x265', 'HEVC', 'AVC', 'XviD', 'DivX', 'AV1', 'VP9', 'other'])
    .describe('Video codec. "other" for anything not in this list.')
    .nullable()
    .catch(null),
});

export const ParsedReleaseSchema = z.object({
  title: z
    .string()
    .describe('Cleaned series or movie name — no year, no resolution, no release group, no codec'),
  type: z
    .enum(['series', 'movie'])
    .describe('"series" for TV shows and anime; "movie" for films')
    .catch('series'),
  matchType: z
    .enum(['episode', 'season_pack', 'complete_series'])
    .describe(
      '"episode" = single episode file. "season_pack" = full season of a TV series. "complete_series" = all seasons of a series OR a single movie file.',
    )
    .catch('episode'),
  seasonNumber: z
    .number()
    .describe('Season number for episodes/season packs. null for movies or complete series.')
    .nullable()
    .catch(null),
  episodeNumbers: z
    .array(z.number())
    .describe('Episode numbers. Empty array for season packs, complete series, movies.')
    .catch([]),
  year: z
    .number()
    .describe('Disambiguation year if part of the title (e.g. Archer 2009). null otherwise.')
    .nullable()
    .catch(null),
  quality: QualitySchema.nullable().catch(null),
});

export const ParsedReleaseWithScoreSchema = ParsedReleaseSchema.extend({
  relevanceScore: z
    .number()
    .min(0)
    .max(100)
    .describe(
      '0–100 relevance to the search context. 90–100 = exact match (right show, right season pack). 70–89 = correct season individual episodes or UHD pack. 50–69 = complete series or adjacent season. 0–49 = wrong season, wrong show, or poor quality.',
    )
    .catch(50),
});

const BatchResponseSchema = z.object({
  results: z.array(ParsedReleaseWithScoreSchema),
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

// ── Regex fallback (no AI dependency) ───────────────────────────────────────

function regexFallback(title: string): ParsedRelease | null {
  // SxxExx — single episode
  const episodeMatch = title.match(/S(\d{1,2})E(\d{1,3})/i);
  if (episodeMatch) {
    const matchIdx = title.search(/S\d{1,2}E\d{1,3}/i);
    const rawTitle = matchIdx > 0 ? title.substring(0, matchIdx) : title;
    return {
      title: rawTitle.replace(/[._\- ]+$/, '').replace(/[._]/g, ' ').trim(),
      type: 'series',
      matchType: 'episode',
      seasonNumber: parseInt(episodeMatch[1]!, 10),
      episodeNumbers: [parseInt(episodeMatch[2]!, 10)],
      year: null,
      quality: null,
    };
  }

  // Lone season marker (S01 without episode) — season pack
  if (/\bS\d{1,2}\b/i.test(title) && !/S\d{1,2}E\d/i.test(title)) {
    const seasonMatch = title.match(/\bS(\d{1,2})\b/i);
    const matchIdx = title.search(/\bS\d{1,2}\b/i);
    const rawTitle = matchIdx > 0 ? title.substring(0, matchIdx) : title;
    return {
      title: rawTitle.replace(/[._\- ]+$/, '').replace(/[._]/g, ' ').trim(),
      type: 'series',
      matchType: 'season_pack',
      seasonNumber: seasonMatch ? parseInt(seasonMatch[1]!, 10) : null,
      episodeNumbers: [],
      year: null,
      quality: null,
    };
  }

  return null;
}

// ── Service ──────────────────────────────────────────────────────────────────

class ReleaseParserService {
  private queue: Promise<void> = Promise.resolve();

  // parse() — single title, serial queue, regex fallback on failure
  async parse(title: string): Promise<ParsedRelease | null> {
    if (!process.env.OPENAI_API_KEY) {
      return regexFallback(title);
    }

    let resultResolve!: (value: ParsedRelease | null) => void;
    const resultPromise = new Promise<ParsedRelease | null>(resolve => {
      resultResolve = resolve;
    });

    // Serial queue: each call waits for the previous to finish.
    // The .catch(() => {}) on the tail keeps the chain alive across failures.
    this.queue = this.queue
      .then(() => this._parseSingle(title))
      .then(result => resultResolve(result))
      .catch(() => resultResolve(null));

    return resultPromise;
  }

  private async _parseSingle(title: string): Promise<ParsedRelease | null> {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = openai.chat('gpt-5-nano');
    const delays = [1000, 2000];

    for (let attempt = 0; attempt <= delays.length; attempt++) {
      try {
        const { object } = await generateObject({
          model,
          schema: ParsedReleaseSchema,
          prompt: `Parse this media release title and extract structured information:\n\n"${title}"`,
          abortSignal: AbortSignal.timeout(30000),
        });
        return object;
      } catch {
        if (attempt < delays.length) {
          await new Promise(resolve => setTimeout(resolve, delays[attempt]!));
        }
      }
    }

    return regexFallback(title);
  }

  // parseBatch() — one AI call for all titles, no queue
  async parseBatch(titles: string[], context?: SearchContext): Promise<ParsedReleaseWithScore[]> {
    if (!process.env.OPENAI_API_KEY || titles.length === 0) {
      return [];
    }

    const contextBlock = this._buildContextBlock(context);
    const titlesBlock = titles.map((t, i) => `${i + 1}. ${t}`).join('\n');
    const prompt = [
      'You are a media release parser and relevance scorer.',
      contextBlock ? `Search context:\n${contextBlock}` : '',
      'Parse each release title below and score its relevance to the search context.',
      'Return one entry per title in the same order.',
      '',
      titlesBlock,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const model = openai.chat('gpt-5-nano');

      const { object } = await generateObject({
        model,
        schema: BatchResponseSchema,
        prompt,
        abortSignal: AbortSignal.timeout(60000),
      });

      return object.results;
    } catch {
      return [];
    }
  }

  private _buildContextBlock(context?: SearchContext): string {
    if (!context) return '';
    const parts: string[] = [];
    if (context.seriesTitle) parts.push(`Series: ${context.seriesTitle}`);
    if (context.movieTitle) parts.push(`Movie: ${context.movieTitle}`);
    if (context.seasonNumber !== undefined) parts.push(`Season: ${context.seasonNumber}`);
    if (context.episodeNumber !== undefined) parts.push(`Episode: ${context.episodeNumber}`);
    if (context.preferredResolution) parts.push(`Preferred resolution: ${context.preferredResolution}`);
    return parts.join(' / ');
  }
}

export const releaseParser = new ReleaseParserService();
