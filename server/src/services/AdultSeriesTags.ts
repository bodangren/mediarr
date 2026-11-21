/**
 * Adult library: derive a series key and tags from what a file already says.
 *
 * Owner request 2026-11-21: "sections per 'series' and maybe tagging with tag filters".
 * The domain has no series and no tags - only `title`, `fileName`, `studio`, `quality`,
 * `releaseDate` - so both are derived here, once, at scan time, and stored on the row.
 * Nothing is guessed beyond what the filename actually contains: a derivable key is
 * returned, otherwise `null` ("no shelf", never a miscellaneous pile).
 */

export interface AdultDerivationInput {
  title?: string | null;
  fileName?: string | null;
  studio?: string | null;
  quality?: string | null;
  releaseDate?: string | null;
  needsReview?: boolean;
  keep?: boolean;
  isWatched?: boolean;
}

const QUALITY_WORDS = /\b(2160p|1080p|720p|480p|4k|uhd|fhd|hd|sd|xxx|x265|x264|h264|h265|hevc|av1|aac|mp4|mkv|wmv)\b/gi;
const DATE_WORDS = /\b(?:\d{4}[.\-_]\d{2}[.\-_]\d{2}|\d{2}[.\-_]\d{2}[.\-_]\d{4}|\d{4})\b/g;
const SITE_WORDS = /\b(?:www\.[a-z0-9-]+\.[a-z]{2,}|[a-z0-9-]+\.(?:com|net|org|xxx|tv))\b/gi;
/** Episode-like suffixes: "Scene 2", "Part 3", "Ep 4", "Episode 5", "#7". */
const SEQUEL_WORDS = /\b(?:scene|part|pt|ep|episode|vol|volume|chapter)\s*[-.#]?\s*\d+\b/gi;
const BRACKETED = /[\[\(\{][^\]\)\}]*[\]\)\}]/g;

function tidy(value: string): string {
  return value
    .replace(BRACKETED, ' ')
    .replace(QUALITY_WORDS, ' ')
    .replace(SITE_WORDS, ' ')
    .replace(DATE_WORDS, ' ')
    .replace(SEQUEL_WORDS, ' ')
    .replace(/[_\.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-–—:]+|[\s\-–—:]+$/g, '')
    .trim();
}

/**
 * The shelf an item belongs to, or `null` when the file name does not say.
 *
 * Rules, in order:
 * 1. A "Title - Subtitle" name groups under the part before the dash only when that part
 *    repeats across the library (handled by the caller); here the *candidate* is the
 *    leading segment before a sequel marker like "Scene 2" or "Part 3".
 * 2. Otherwise the tidied title (or file name) is the key.
 * 3. A key that is only a number, only a studio name, or shorter than three characters is
 *    not a series: `null`.
 */
export function adultSeriesKey(input: AdultDerivationInput): string | null {
  const raw = (input.title ?? '').trim() || fileNameToTitle(input.fileName ?? '') || '';
  if (raw.length === 0) return null;

  // "Blacked - Title Scene 2": the part before the dash is the studio/series brand.
  const dashParts = raw.split(/\s+[-–—]\s+/).map((part) => part.trim()).filter((part) => part.length > 0);
  const studio = (input.studio ?? '').trim().toLowerCase();
  const candidates: Array<{ value: string; allowStudioName: boolean }> = [];
  // A dashed name's leading segment is a brand/series even when it equals the studio
  // ("Blacked - Scene 2" is a Blacked series). The whole name equalling the studio is
  // not a series, because the studio filter already covers it.
  if (dashParts.length >= 2) candidates.push({ value: dashParts[0]!, allowStudioName: true });
  candidates.push({ value: raw, allowStudioName: false });

  for (const candidate of candidates) {
    const key = tidy(candidate.value);
    if (key.length < 3) continue;
    if (/^\d+$/.test(key)) continue;
    if (!candidate.allowStudioName && studio.length > 0 && key.toLowerCase() === studio) continue;
    return key;
  }
  return null;
}

/** File name without extension and without the leading site/quality noise. */
function fileNameToTitle(fileName: string): string {
  return fileName.replace(/\.[a-z0-9]{2,4}$/i, '').trim();
}

/**
 * Tags are the filters the owner asked for: studio, quality, year, plus state.
 * Stored as a JSON array so a WHERE ... LIKE 'tag' is enough to filter (the library is
 * small; a join table would be premature).
 */
export function adultTags(input: AdultDerivationInput): string[] {
  const tags = new Set<string>();
  const studio = (input.studio ?? '').trim();
  if (studio.length > 0) tags.add(`studio:${slug(studio)}`);

  const quality = (input.quality ?? '').trim().toLowerCase();
  if (quality.length > 0) tags.add(`quality:${slug(quality)}`);
  else {
    const fromName = `${input.title ?? ''} ${input.fileName ?? ''}`.match(/\b(2160p|1080p|720p|480p|4k)\b/i);
    if (fromName) tags.add(`quality:${slug(fromName[1]!)}`);
  }

  const year = (input.releaseDate ?? '').match(/(19|20)\d{2}/)?.[0];
  if (year) tags.add(`year:${year}`);

  if (input.needsReview) tags.add('review');
  if (input.keep) tags.add('kept');
  tags.add(input.isWatched ? 'watched' : 'unwatched');
  return [...tags].sort();
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
