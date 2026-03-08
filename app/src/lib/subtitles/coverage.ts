/**
 * Shared subtitle coverage status utilities used across movie and series views.
 */

export type SubtitleCoverageStatus = 'complete' | 'partial' | 'missing' | 'none';

export interface SubtitleCoverageSummary {
  availableLanguages: string[];
  missingLanguages: string[];
  status: SubtitleCoverageStatus;
}

/** Normalize, deduplicate, and sort an array of language code strings. */
export function normalizeLanguageCodes(values: string[]): string[] {
  return [...new Set(values.map(value => value.trim().toLowerCase()).filter(Boolean))].sort();
}

/**
 * Derive a subtitle coverage summary from raw available and missing language lists.
 */
export function summarizeSubtitleCoverage(
  availableLanguagesRaw: string[],
  missingLanguagesRaw: string[],
): SubtitleCoverageSummary {
  const availableLanguages = normalizeLanguageCodes(availableLanguagesRaw);
  const missingLanguages = normalizeLanguageCodes(missingLanguagesRaw);

  let status: SubtitleCoverageStatus = 'none';
  if (availableLanguages.length > 0 && missingLanguages.length === 0) {
    status = 'complete';
  } else if (availableLanguages.length > 0 && missingLanguages.length > 0) {
    status = 'partial';
  } else if (availableLanguages.length === 0 && missingLanguages.length > 0) {
    status = 'missing';
  }

  return { availableLanguages, missingLanguages, status };
}

/** Return a human-readable label for a subtitle coverage status. */
export function subtitleStatusLabel(status: SubtitleCoverageStatus): string {
  if (status === 'complete') return 'Subtitles Complete';
  if (status === 'partial') return 'Subtitles Partial';
  if (status === 'missing') return 'Subtitles Missing';
  return 'No Subtitle Data';
}

/** Return a Tailwind CSS class string for a subtitle status badge. */
export function subtitleStatusBadgeClass(status: SubtitleCoverageStatus): string {
  if (status === 'complete') return 'bg-status-completed/20 text-status-completed';
  if (status === 'partial') return 'bg-accent-warning/20 text-accent-warning';
  if (status === 'missing') return 'bg-status-error/20 text-status-error';
  return 'bg-surface-2 text-text-secondary';
}
