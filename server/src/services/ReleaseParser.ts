import { generateText, Output } from 'ai';
import { z } from 'zod';
import path from 'node:path';
import {
  resolveReleaseParserAiConfig,
  resolveReleaseParserRuntimeConfig,
} from './ReleaseParserProvider';

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

/**
 * A batch result carrying the 1-based index of the input title it was produced for.
 *
 * Results used to be matched to titles by array position. Cheap models truncate — a
 * live probe on 2026-07-28 saw `mistral-nemo` return 7 results for 8 titles twice and
 * `openrouter/free` return 6 for 8 — and a positional zip silently shifts every
 * subsequent parse onto the wrong release. Since `relevanceScore` feeds
 * `CustomFormatScoringEngine` and auto-grab fires at a total score of 50, that
 * mis-attribution can trigger an automatic download of the wrong release.
 *
 * `index` is `.nullable().catch(null)` so a model that ignores the instruction
 * degrades to the strict-length positional path rather than failing the whole batch.
 */
export const IndexedParsedReleaseSchema = ParsedReleaseWithScoreSchema.extend({
  index: z
    .number()
    .int()
    .describe('The 1-based number of the input title this result was produced for.')
    .nullable()
    .catch(null),
});

const BatchResponseSchema = z.object({
  results: z.array(IndexedParsedReleaseSchema),
});

export type ParsedRelease = z.infer<typeof ParsedReleaseSchema>;
export type ParsedReleaseWithScore = z.infer<typeof ParsedReleaseWithScoreSchema>;
export type IndexedParsedRelease = z.infer<typeof IndexedParsedReleaseSchema>;

/**
 * One slot of a `parseBatch` response. The returned array always has exactly
 * `titles.length` slots; a slot is `null` when no result could be attributed to that
 * title with confidence. Never assume a slot is populated.
 */
export type BatchParseSlot = ParsedReleaseWithScore | null;

export interface SearchContext {
  seriesTitle?: string | undefined;
  movieTitle?: string | undefined;
  seasonNumber?: number | undefined;
  episodeNumber?: number | undefined;
  preferredResolution?: string | undefined;
}

// ── Regex fallback (no AI dependency) ───────────────────────────────────────

function regexFallback(title: string): ParsedRelease | null {
  // SxxExx — single or multi-episode (S01E01, S01E01E02, S01E01E02E03)
  const episodeMatch = title.match(/S(\d{1,2})E(\d{1,3}(?:E\d{1,3})*)/i);
  if (episodeMatch) {
    const matchIdx = title.search(/S\d{1,2}E\d{1,3}/i);
    const rawTitle = matchIdx > 0 ? title.substring(0, matchIdx) : title;
    const episodeNumbers = episodeMatch[2]!.split('E').map(n => parseInt(n, 10));
    return {
      title: rawTitle.replace(/[._\- ]+$/, '').replace(/[._]/g, ' ').trim(),
      type: 'series',
      matchType: 'episode',
      seasonNumber: parseInt(episodeMatch[1]!, 10),
      episodeNumbers,
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

// ── Prompts ───────────────────────────────────────────────────────────────────

const PARSE_PROMPT = (title: string) => `You are a media release title parser. Analyse this title and return ONLY a valid JSON object — no markdown, no explanation, no code fences.

Title: "${title}"

Return exactly this JSON shape:
{
  "title": "<show/movie name only — strip SxxExx, NNxNN, season/episode markers, year, codec, resolution, release group, file extension, and everything after the episode marker>",
  "type": "series" | "movie",
  "matchType": "episode" | "season_pack" | "complete_series",
  "seasonNumber": <integer> | null,
  "episodeNumbers": [<integers>],
  "year": <4-digit integer> | null,
  "quality": {
    "resolution": "SD" | "480p" | "720p" | "1080p" | "unknown",
    "source": "BluRay" | "WEB-DL" | "WEBRip" | "HDTV" | "PDTV" | "DVDRip" | "DVD" | "REMUX" | "AMZN" | "NF" | "HULU" | "DSNP" | "ATVP" | "other",
    "codec": "x264" | "x265" | "HEVC" | "AVC" | "XviD" | "DivX" | "AV1" | "VP9" | "other"
  } | null
}

Rules:
- title: ONLY the show/movie name. For "Archer.2009.S10E04.Some.Episode.Title" → title is "Archer", for "Breaking.Bad.S03E05.Mas" → "Breaking Bad"
- matchType "episode": single episode file (has SxxExx or NNxNN pattern)
- matchType "season_pack": full season with no episode number (e.g. S02 with no E number)
- matchType "complete_series": all seasons of a series, OR any standalone movie file
- type "movie": if it is clearly a film (no season/episode markers, has a movie release year)
- resolution "unknown" for 4K, UHD, 2160p, or anything above 1080p
- year: the 4-digit disambiguation year if it is part of the show title (e.g. "Archer (2009)" → 2009, "The Office (US)" has no year). The release year of a movie (e.g. "Oppenheimer.2023") is NOT a disambiguation year — return null. A year after a series name like "Archer.2009" IS a disambiguation year → return 2009.
- episodeNumbers: empty array [] for season packs, complete series, and movies`;

const FILES_PROMPT = (paths: string[]) => [
  'You are a media file path parser. Return ONLY a valid JSON object — no markdown, no explanation, no code fences.',
  '',
  'Each input is a file path relative to a media library root. Use the folder structure as context when the filename alone is ambiguous.',
  'Example: "Sopranos/Season 1/episode 5.mkv" → title="The Sopranos", seasonNumber=1, episodeNumbers=[5], matchType="episode"',
  '',
  'Field rules:',
  '- title: series or movie name only — strip season/episode markers, year, codec, resolution, release group, file extension',
  '- matchType: "episode" (single episode), "season_pack" (full season directory), "complete_series" (all seasons or movie)',
  '- type: "series" for TV/anime, "movie" for films',
  '- seasonNumber: integer from filename or parent folder, null for movies',
  '- episodeNumbers: array of integers. Empty array for season packs, complete series, movies.',
  '- year: disambiguation year if part of the show title (e.g. "Archer (2009)" → 2009). null otherwise.',
  '- resolution "unknown" for 4K / UHD / 2160p.',
  '',
  'Return exactly this JSON shape (one entry per path, same order):',
  '{"results":[{"title":"…","type":"series"|"movie","matchType":"episode"|"season_pack"|"complete_series","seasonNumber":N|null,"episodeNumbers":[N,…],"year":N|null,"quality":{"resolution":"SD"|"480p"|"720p"|"1080p"|"unknown","source":"BluRay"|"WEB-DL"|"WEBRip"|"HDTV"|"PDTV"|"DVDRip"|"DVD"|"REMUX"|"AMZN"|"NF"|"HULU"|"DSNP"|"ATVP"|"other","codec":"x264"|"x265"|"HEVC"|"AVC"|"XviD"|"DivX"|"AV1"|"VP9"|"other"}}]}',
  '',
  'Paths:',
  ...paths.map((p, i) => `${i + 1}. ${p}`),
]
  .filter(s => s !== undefined)
  .join('\n');

const BATCH_PROMPT = (titles: string[], contextBlock: string) => [
  'You are a media release parser and relevance scorer. Return ONLY a valid JSON object — no markdown, no explanation, no code fences.',
  '',
  contextBlock ? `Search context: ${contextBlock}` : '',
  '',
  'For each numbered title below, parse it and score its relevance to the search context (0–100).',
  'Scoring: 90–100 = exact season pack matching the requested season. 70–89 = individual episodes from the requested season. 50–69 = complete series or adjacent/wrong season pack. 0–49 = wrong show, wrong season, or poor quality.',
  'IMPORTANT: when a season is specified in the context, the season_pack for that exact season MUST score higher than complete_series.',
  '',
  'Field rules:',
  '- matchType: "episode" (SxxExx), "season_pack" (full season, no episode), "complete_series" (all seasons OR any movie file)',
  '- type "movie" for films. ALL movies use matchType "complete_series".',
  '- resolution "unknown" for 4K / UHD / 2160p. "1080p" only if title explicitly says 1080p.',
  '- source: "REMUX" is a source (not a codec). BluRay.REMUX → source="REMUX".',
  '',
  'CRITICAL: return one entry per title, in the same order, and set "index" on every',
  'entry to the number shown beside its title below. Never omit an entry — if a title',
  'cannot be parsed, still return an entry for it with its "index" and your best guess.',
  'The "index" is how each result is matched back to its title; an entry without a',
  'correct "index" is discarded.',
  '',
  'Return exactly this JSON shape:',
  '{"results":[{"index":N,"title":"…","type":"series"|"movie","matchType":"episode"|"season_pack"|"complete_series","seasonNumber":N|null,"episodeNumbers":[N,…],"year":N|null,"quality":{"resolution":"SD"|"480p"|"720p"|"1080p"|"unknown","source":"BluRay"|"WEB-DL"|"WEBRip"|"HDTV"|"PDTV"|"DVDRip"|"DVD"|"REMUX"|"AMZN"|"NF"|"HULU"|"DSNP"|"ATVP"|"other","codec":"x264"|"x265"|"HEVC"|"AVC"|"XviD"|"DivX"|"AV1"|"VP9"|"other"},"relevanceScore":N}]}',
  '',
  'Titles:',
  ...titles.map((t, i) => `${i + 1}. ${t}`),
]
  .filter(s => s !== undefined)
  .join('\n');

// ── Batch attribution ────────────────────────────────────────────────────────

/** Drops the transport-only `index` field, leaving a clean parse result. */
function stripIndex(result: IndexedParsedRelease): ParsedReleaseWithScore {
  const { index: _index, ...rest } = result;
  return rest;
}

/**
 * Places batch results into `titleCount` slots, matching on the model's echoed
 * 1-based index rather than on array position.
 *
 * Every uncertain case leaves the slot `null`. That is deliberate: an empty slot costs
 * a Levenshtein-scored release, whereas a wrong slot costs an automatic download of
 * the wrong release, because `relevanceScore` is consumed directly as `confidenceScore`
 * by `CustomFormatScoringEngine` and auto-grab fires at a total score of 50.
 *
 * Exported for direct unit testing of the attribution rules.
 */
export function assignBatchSlots(
  titleCount: number,
  results: IndexedParsedRelease[],
): BatchParseSlot[] {
  const slots: BatchParseSlot[] = new Array<BatchParseSlot>(titleCount).fill(null);
  if (titleCount === 0) return slots;

  const indexed = results.filter(result => result.index !== null);

  // No index anywhere: the model ignored the instruction. Position is only
  // trustworthy when the counts match exactly, since nothing can have shifted.
  // This mirrors the guard parseFiles() has always had.
  if (indexed.length === 0) {
    if (results.length !== titleCount) return slots;
    for (let i = 0; i < titleCount; i++) {
      slots[i] = stripIndex(results[i]!);
    }
    return slots;
  }

  // Group by claimed index so a duplicate can be discarded rather than guessed at.
  const claims = new Map<number, IndexedParsedRelease[]>();
  for (const result of indexed) {
    const index = result.index!;
    if (!Number.isInteger(index) || index < 1 || index > titleCount) continue;
    const existing = claims.get(index);
    if (existing) existing.push(result);
    else claims.set(index, [result]);
  }

  for (const [index, claimants] of claims) {
    // Two results claiming one title makes attribution ambiguous — leave it empty.
    if (claimants.length !== 1) continue;
    slots[index - 1] = stripIndex(claimants[0]!);
  }

  return slots;
}

// ── Service ──────────────────────────────────────────────────────────────────

class ReleaseParserService {
  private queue: Promise<void> = Promise.resolve();

  // parse() — single title, serial queue, regex fallback on failure
  async parse(title: string): Promise<ParsedRelease | null> {
    const aiConfig = resolveReleaseParserAiConfig();
    if (!aiConfig.enabled) {
      return regexFallback(title);
    }

    let resultResolve!: (value: ParsedRelease | null) => void;
    const resultPromise = new Promise<ParsedRelease | null>(resolve => {
      resultResolve = resolve;
    });

    // Serial queue: each call waits for the previous to finish.
    // The .catch at the tail keeps the chain alive across failures.
    this.queue = this.queue
      .then(() => this._parseSingle(title, aiConfig))
      .then(result => resultResolve(result))
      .catch(() => resultResolve(regexFallback(title)));

    return resultPromise;
  }

  private async _parseSingle(title: string, aiConfig = resolveReleaseParserAiConfig()): Promise<ParsedRelease | null> {
    if (!aiConfig.enabled) {
      return regexFallback(title);
    }

    const delays = [1000, 2000];
    const { parseTimeoutMs } = resolveReleaseParserRuntimeConfig();

    for (let attempt = 0; attempt <= delays.length; attempt++) {
      try {
        // Use Output.json() to avoid provider-side schema enforcement on nullable fields.
        // Validate the returned JSON ourselves with Zod's .catch() fallbacks.
        const { output } = await generateText({
          model: aiConfig.model!,
          output: Output.json(),
          prompt: PARSE_PROMPT(title),
          ...(aiConfig.providerOptions ? { providerOptions: aiConfig.providerOptions } : {}),
          abortSignal: AbortSignal.timeout(parseTimeoutMs),
        });

        const parsed = ParsedReleaseSchema.safeParse(output);
        if (parsed.success) return parsed.data;
      } catch {
        if (attempt < delays.length) {
          await new Promise(resolve => setTimeout(resolve, delays[attempt]!));
        }
      }
    }

    return regexFallback(title);
  }

  /**
   * One AI call for all titles, no queue.
   *
   * Always resolves to exactly `titles.length` slots. A slot is `null` when no result
   * could be attributed to that title with confidence — callers must never assume a
   * slot is populated. See {@link assignBatchSlots} for the attribution rules.
   */
  async parseBatch(titles: string[], context?: SearchContext): Promise<BatchParseSlot[]> {
    const emptySlots = (): BatchParseSlot[] =>
      new Array<BatchParseSlot>(titles.length).fill(null);

    const aiConfig = resolveReleaseParserAiConfig();
    if (!aiConfig.enabled || titles.length === 0) {
      return emptySlots();
    }

    const { batchTimeoutMs } = resolveReleaseParserRuntimeConfig();
    const contextBlock = this._buildContextBlock(context);

    try {
      const { output } = await generateText({
        model: aiConfig.model!,
        output: Output.json(),
        prompt: BATCH_PROMPT(titles, contextBlock),
        ...(aiConfig.providerOptions ? { providerOptions: aiConfig.providerOptions } : {}),
        abortSignal: AbortSignal.timeout(batchTimeoutMs),
      });

      const parsed = BatchResponseSchema.safeParse(output);
      if (!parsed.success) return emptySlots();

      return assignBatchSlots(titles.length, parsed.data.results);
    } catch {
      return emptySlots();
    }
  }

  // parseFiles() — batch parse file paths (relative to scan root), no relevance scoring
  async parseFiles(filePaths: string[]): Promise<ParsedRelease[]> {
    if (filePaths.length === 0) return [];

    // Regex fallback for when AI is unavailable
    const regexResults = () => filePaths.map(p => regexFallback(path.basename(p)) ?? {
      title: path.basename(p, path.extname(p)),
      type: 'series' as const,
      matchType: 'episode' as const,
      seasonNumber: null,
      episodeNumbers: [],
      year: null,
      quality: null,
    });

    const aiConfig = resolveReleaseParserAiConfig();
    if (!aiConfig.enabled) {
      return regexResults();
    }

    const BATCH_SIZE = 50;
    const { filesTimeoutMs } = resolveReleaseParserRuntimeConfig();
    const results: ParsedRelease[] = [];

    for (let offset = 0; offset < filePaths.length; offset += BATCH_SIZE) {
      const batch = filePaths.slice(offset, offset + BATCH_SIZE);
      console.log(`[parseFiles] batch ${Math.floor(offset / BATCH_SIZE) + 1} — ${batch.length} paths`);
      const t0 = Date.now();

      try {
        const { output } = await generateText({
          model: aiConfig.model!,
          output: Output.json(),
          prompt: FILES_PROMPT(batch),
          ...(aiConfig.providerOptions ? { providerOptions: aiConfig.providerOptions } : {}),
          abortSignal: AbortSignal.timeout(filesTimeoutMs),
        });

        const parsed = z.object({ results: z.array(ParsedReleaseSchema) }).safeParse(output);
        console.log(`[parseFiles] done in ${Date.now() - t0}ms — success:${parsed.success}`);

        if (parsed.success && parsed.data.results.length === batch.length) {
          results.push(...parsed.data.results);
        } else {
          // Fallback for this batch only
          results.push(...batch.map(p => regexFallback(path.basename(p)) ?? {
            title: path.basename(p, path.extname(p)),
            type: 'series' as const,
            matchType: 'episode' as const,
            seasonNumber: null,
            episodeNumbers: [],
            year: null,
            quality: null,
          }));
        }
      } catch (err) {
        console.log(`[parseFiles] error after ${Date.now() - t0}ms:`, err);
        results.push(...batch.map(p => regexFallback(path.basename(p)) ?? {
          title: path.basename(p, path.extname(p)),
          type: 'series' as const,
          matchType: 'episode' as const,
          seasonNumber: null,
          episodeNumbers: [],
          year: null,
          quality: null,
        }));
      }
    }

    return results;
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
