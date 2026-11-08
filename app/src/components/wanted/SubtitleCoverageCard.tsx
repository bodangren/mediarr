import type { SubtitleCoverageReport } from '../../lib/api/subtitleWantedApi';

const BUCKET_LABELS: Record<string, string> = {
  'continue-watching': 'Continue watching',
  'recently-watched': 'Watched recently',
  'recently-added': 'New',
  backfill: 'Backfill',
};

export interface SubtitleCoverageCardProps {
  report: SubtitleCoverageReport | null;
  isLoading?: boolean;
}

/**
 * Coverage summary for the wanted page (track feature_subtitle_coverage_priority_20261108).
 *
 * Answers "do the things we actually watch have subtitles?" at a glance: the high-priority
 * denominator first, then per-bucket counts. It deliberately says "both languages" rather than
 * "bilingual" because a merged EN+ZH sidecar is a property of the cues, not of the track rows.
 */
export function SubtitleCoverageCard({ report, isLoading = false }: SubtitleCoverageCardProps) {
  if (isLoading) {
    return <div className="rounded-lg border border-border bg-card p-4 text-text-muted">Measuring subtitle coverage…</div>;
  }
  if (!report) {
    return null;
  }

  const { highPriority: high } = report;
  // "Covered" used to mean "has Chinese", which contradicted the table's "Both languages" column:
  // 9 high-priority / 7 covered / 2 missing read as if 7 were bilingual when only 6 were (review
  // finding, 2026-11-08). Spell the three states out instead.
  const both = report.buckets
    .filter((bucket) => bucket.bucket === 'continue-watching' || bucket.bucket === 'recently-watched')
    .reduce((sum, bucket) => sum + bucket.withBoth, 0);
  const chineseOnly = high.covered - both;
  const covered = high.total - high.missing;
  const coveragePercent = high.total === 0 ? 100 : Math.round((covered / high.total) * 100);

  return (
    <section className="rounded-lg border border-border bg-card p-4" aria-label="Subtitle coverage">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-text-primary">Subtitle coverage</h2>
        <p className="text-sm text-text-muted">
          {high.total} high-priority · {both} EN+ZH · {chineseOnly} Chinese only · {high.missing} without Chinese
        </p>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-accent-primary"
          style={{ width: `${coveragePercent}%` }}
          role="progressbar"
          aria-valuenow={coveragePercent}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="text-left text-text-muted">
            <th className="font-medium">Bucket</th>
            <th className="font-medium">Items</th>
            <th className="font-medium">Chinese</th>
            <th className="font-medium">Both languages</th>
            <th className="font-medium">No Chinese</th>
          </tr>
        </thead>
        <tbody>
          {report.buckets.map((bucket) => (
            <tr key={bucket.bucket} className="border-t border-border text-text-primary">
              <td className="py-1.5">{BUCKET_LABELS[bucket.bucket] ?? bucket.bucket}</td>
              <td className="py-1.5">{bucket.total}</td>
              <td className="py-1.5">{bucket.withChinese}</td>
              <td className="py-1.5">{bucket.withBoth}</td>
              <td className="py-1.5">{bucket.missingChinese}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
