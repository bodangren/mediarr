import { ProbeMetadataParser } from './ProbeMetadataParser';

/**
 * Registers the subtitle tracks that are physically embedded in a video file.
 *
 * Movies imported through `BulkImportService` are probed (ffprobe) and get
 * EMBEDDED track rows, but episodes linked by `EpisodeFileLinker` never were:
 * measured 2026-11-19 on Orange Is the New Black S07, where all 13 files carry an
 * English subrip stream and a bilingual `.zho.srt` sidecar, yet the DB only had
 * the EXTERNAL `zho` row. The client therefore showed 中文 instead of 中英 and
 * could not offer the embedded English track at all.
 *
 * The sweep is bounded per pass and ordered newest-variant-first, so content that
 * was just filed is fixed in the first sweep rather than after a full rotation.
 */

export interface EmbeddedTrackSweepDeps {
  /**
   * Whether this file was already probed and produced no embedded tracks (or the
   * same tracks) before. Without this the sweep re-probes every trackless file on
   * every pass, forever: 2,798 variants had no embedded streams and would have
   * burned 150 ffprobe calls every ten minutes for nothing.
   */
  alreadyProbed?(variantId: number, filePath: string): Promise<boolean>;
  /** Records the probe so the file is not probed again until it changes. */
  rememberProbe?(variantId: number, filePath: string, embeddedTracks: number): Promise<void>;
  /** Variants (newest first) that have no EMBEDDED track rows yet. */
  listVariantsWithoutEmbeddedTracks(limit: number): Promise<Array<{ id: number; path: string }>>;
  /** Stream metadata for the file (ffprobe JSON or mediainfo JSON). */
  probe(filePath: string): Promise<unknown>;
  createTrack(track: {
    variantId: number;
    source: 'EMBEDDED';
    streamIndex: number;
    languageCode: string | null;
    isForced: boolean;
    isHi: boolean;
    codec?: string;
  }): Promise<void>;
}

export interface EmbeddedTrackSweepResult {
  checked: number;
  skipped: number;
  registered: number;
  failed: Array<{ id: number; error: string }>;
}

export async function sweepEmbeddedTracks(
  deps: EmbeddedTrackSweepDeps,
  options: { limit?: number; parser?: ProbeMetadataParser } = {},
): Promise<EmbeddedTrackSweepResult> {
  const parser = options.parser ?? new ProbeMetadataParser();
  const limit = Math.max(1, options.limit ?? 40);
  const variants = await deps.listVariantsWithoutEmbeddedTracks(limit);
  const result: EmbeddedTrackSweepResult = { checked: variants.length, skipped: 0, registered: 0, failed: [] };

  for (const variant of variants) {
    if (deps.alreadyProbed && await deps.alreadyProbed(variant.id, variant.path)) {
      result.skipped += 1;
      continue;
    }
    let metadata: unknown;
    try {
      metadata = await deps.probe(variant.path);
    } catch (error) {
      result.failed.push({ id: variant.id, error: error instanceof Error ? error.message : String(error) });
      continue;
    }

    const parsed = parser.parse(metadata);
    if (deps.rememberProbe) {
      await deps.rememberProbe(variant.id, variant.path, parsed.embeddedSubtitleTracks.length);
    }
    for (const track of parsed.embeddedSubtitleTracks) {
      try {
        await deps.createTrack({
          variantId: variant.id,
          source: 'EMBEDDED',
          streamIndex: Number(track.streamIndex ?? -1),
          languageCode: track.languageCode ?? null,
          isForced: Boolean(track.isForced),
          isHi: Boolean(track.isHi),
          ...(track.codec ? { codec: track.codec } : {}),
        });
        result.registered += 1;
      } catch (error) {
        result.failed.push({ id: variant.id, error: error instanceof Error ? error.message : String(error) });
      }
    }
  }
  return result;
}
