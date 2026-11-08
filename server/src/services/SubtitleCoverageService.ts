import { VIEWING_PRIORITY_BUCKETS, type ViewingPriorityBucket } from './ViewingPriorityService';

/**
 * Subtitle coverage report (track feature_subtitle_coverage_priority_20261108, Phase 2).
 *
 * Answers the question the app could not answer before: *do the things we actually watch carry
 * subtitles?* Every item with a file is classified into a viewing-priority bucket, then counted by
 * what it has: Chinese, English, both (the bilingual input), or nothing.
 *
 * It deliberately does not claim "bilingual": bilingual is a property of the cues inside a sidecar,
 * classified by `BilingualSubtitleService`, not of the track rows. "both" means both languages are
 * available, which is the precondition for merging — the bilingual state file is the authority for
 * merged files and is reported separately by the subtitle automation.
 */

const CHINESE_CODES = new Set(['zh', 'zho', 'chi', 'chs', 'cht', 'cmn', 'yue']);
const ENGLISH_CODES = new Set(['en', 'eng']);

export function isChineseLanguage(code: string | null | undefined): boolean {
  return code != null && CHINESE_CODES.has(code.trim().toLowerCase());
}

export function isEnglishLanguage(code: string | null | undefined): boolean {
  return code != null && ENGLISH_CODES.has(code.trim().toLowerCase());
}

export interface CoverageInput {
  kind: 'movie' | 'episode';
  id: number;
  bucket: ViewingPriorityBucket;
  hasChinese: boolean;
  hasEnglish: boolean;
}

export interface CoverageBucketSummary {
  bucket: ViewingPriorityBucket;
  total: number;
  withChinese: number;
  withEnglish: number;
  /** Both languages available — the precondition for a bilingual sidecar. */
  withBoth: number;
  /** No Chinese track at all. */
  missingChinese: number;
  /** Neither language available: the worst case, needs a source before translation. */
  missingBoth: number;
}

export interface SubtitleCoverageReport {
  buckets: CoverageBucketSummary[];
  totals: Omit<CoverageBucketSummary, 'bucket'>;
  highPriority: { total: number; covered: number; missing: number };
}

const emptySummary = (): Omit<CoverageBucketSummary, 'bucket'> => ({
  total: 0,
  withChinese: 0,
  withEnglish: 0,
  withBoth: 0,
  missingChinese: 0,
  missingBoth: 0,
});

/** Pure summary: one pass over the covered items, in the model's bucket order. */
export function summarizeCoverage(items: readonly CoverageInput[]): SubtitleCoverageReport {
  const byBucket = new Map<ViewingPriorityBucket, Omit<CoverageBucketSummary, 'bucket'>>();
  for (const bucket of VIEWING_PRIORITY_BUCKETS) byBucket.set(bucket, emptySummary());

  const totals = emptySummary();
  for (const item of items) {
    const summary = byBucket.get(item.bucket);
    if (!summary) continue;
    for (const target of [summary, totals]) {
      target.total += 1;
      if (item.hasChinese) target.withChinese += 1;
      if (item.hasEnglish) target.withEnglish += 1;
      if (item.hasChinese && item.hasEnglish) target.withBoth += 1;
      if (!item.hasChinese) target.missingChinese += 1;
      if (!item.hasChinese && !item.hasEnglish) target.missingBoth += 1;
    }
  }

  const buckets = VIEWING_PRIORITY_BUCKETS.map((bucket) => ({ bucket, ...(byBucket.get(bucket) as Omit<CoverageBucketSummary, 'bucket'>) }));
  const highPriorityBuckets = buckets.filter(
    (entry) => entry.bucket === 'continue-watching' || entry.bucket === 'recently-watched',
  );
  const highPriority = {
    total: highPriorityBuckets.reduce((sum, entry) => sum + entry.total, 0),
    covered: highPriorityBuckets.reduce((sum, entry) => sum + entry.withChinese, 0),
    missing: highPriorityBuckets.reduce((sum, entry) => sum + entry.missingChinese, 0),
  };

  return { buckets, totals, highPriority };
}
