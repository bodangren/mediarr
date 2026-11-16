import {
  subtitleAvailability,
  type SubtitleAvailability,
} from '../../services/SubtitleAuditService';

/** The subset of a `MediaFileVariant` row this helper reads. */
export interface VariantWithSubtitleTracks {
  subtitleTracks?: readonly { languageCode?: string | null }[] | null;
}

/**
 * `{ zh, en }` subtitle availability for one movie/episode from its variants'
 * subtitle tracks.
 *
 * Callers pass every variant of the item (movie list/detail, or one episode's
 * variants in the series detail payload) so the per-item answer comes from a
 * single already-batched include — never one query per item. The classification
 * is shared with the playback coverage surfaces through
 * `SubtitleAuditService.subtitleAvailability`.
 */
export function subtitleAvailabilityForVariants(
  variants: readonly (VariantWithSubtitleTracks | null | undefined)[] | null | undefined,
): SubtitleAvailability {
  const languageCodes: Array<string | null | undefined> = [];
  for (const variant of variants ?? []) {
    for (const track of variant?.subtitleTracks ?? []) {
      languageCodes.push(track?.languageCode ?? null);
    }
  }
  return subtitleAvailability(languageCodes);
}
