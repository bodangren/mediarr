import path from 'node:path';

/**
 * Recover Chinese subtitle tracks that are embedded in the video container but not exposed to the player.
 *
 * The playback manifest only serves external tracks (`VariantSubtitleTrack.filePath != null`), so an item
 * whose only Chinese subtitle is embedded appears covered in the audit but cannot show Chinese on the TV.
 * Extraction turns text-based embedded tracks into normal `.zho.srt` sidecars, which also makes them
 * eligible for realignment and bilingual merging — no subtitle provider needed.
 */

export const CHINESE_LANGUAGE_CODES = new Set(['chi', 'zho', 'zh', 'cmn', 'zh-cn', 'zh-tw', 'zh-hk']);
/** Text subtitle codecs ffmpeg can convert to SRT. Bitmap codecs (PGS/DVD) would need OCR. */
export const TEXT_SUBTITLE_CODECS = new Set(['subrip', 'srt', 'ass', 'ssa', 'mov_text', 'webvtt', 'text']);

export interface ExtractionCandidate {
  trackId: number;
  videoPath: string;
  streamIndex: number | null;
  languageCode: string | null;
  codec: string | null;
}

export interface ExtractionIo {
  /** Runs ffmpeg with these arguments; must reject when the process fails. */
  exec(args: string[]): Promise<void>;
  fileSize(filePath: string): Promise<number>;
  updateTrack(trackId: number, filePath: string, fileSize: number): Promise<void>;
  warn?(message: string): void;
}

export interface ExtractionResult {
  attempted: number;
  extracted: number;
  skipped: number;
  failed: Array<{ trackId: number; error: string }>;
}

export function isExtractableChineseTrack(candidate: ExtractionCandidate): boolean {
  if (candidate.streamIndex === null || candidate.streamIndex < 0) return false;
  if (!candidate.languageCode || !CHINESE_LANGUAGE_CODES.has(candidate.languageCode.toLowerCase())) return false;
  return Boolean(candidate.codec && TEXT_SUBTITLE_CODECS.has(candidate.codec.toLowerCase()));
}

export function sidecarPathFor(videoPath: string): string {
  return `${videoPath.replace(/\.[^./\\]+$/, '')}.zho.srt`;
}

export async function extractEmbeddedChineseSubtitles(
  candidates: readonly ExtractionCandidate[],
  options: ExtractionIo & {
    limit: number;
    /** Previous attempt counts per track; tracks at/over the cap are skipped instead of retried forever. */
    attempts?: ReadonlyMap<number, number>;
    maxAttempts?: number;
    onOutcome?: (trackId: number, outcome: 'extracted' | 'failed', error?: string) => void | Promise<void>;
  },
): Promise<ExtractionResult> {
  const result: ExtractionResult = { attempted: 0, extracted: 0, skipped: 0, failed: [] };
  const maxAttempts = options.maxAttempts ?? 3;
  const seenOutputs = new Set<string>();
  for (const candidate of candidates) {
    if (result.extracted + result.failed.length >= options.limit) break;
    if (!isExtractableChineseTrack(candidate)) {
      result.skipped += 1;
      continue;
    }
    if ((options.attempts?.get(candidate.trackId) ?? 0) >= maxAttempts) {
      result.skipped += 1;
      continue;
    }
    const candidateOutput = sidecarPathFor(candidate.videoPath);
    if (seenOutputs.has(candidateOutput)) {
      // Two embedded tracks mapping to one sidecar: the first attempt owns it.
      result.skipped += 1;
      continue;
    }
    seenOutputs.add(candidateOutput);
    result.attempted += 1;
    const outputPath = candidateOutput;
    try {
      // A sidecar may already exist from a previous track of the same video (multiple embedded Chinese
      // tracks map to one .zho.srt). Adopt it instead of overwriting with a second extraction.
      const existingSize = await options.fileSize(outputPath).catch(() => 0);
      if (Number.isFinite(existingSize) && existingSize > 0) {
        await options.updateTrack(candidate.trackId, outputPath, existingSize);
        await options.onOutcome?.(candidate.trackId, 'extracted');
        result.extracted += 1;
        continue;
      }
      await options.exec([
        '-nostdin', '-y',
        '-i', candidate.videoPath,
        '-map', `0:${candidate.streamIndex}`,
        '-c:s', 'srt',
        outputPath,
      ]);
      const fileSize = await options.fileSize(outputPath);
      if (!Number.isFinite(fileSize) || fileSize <= 0) {
        throw new Error('extraction produced an empty subtitle file');
      }
      await options.updateTrack(candidate.trackId, outputPath, fileSize);
      await options.onOutcome?.(candidate.trackId, 'extracted');
      result.extracted += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const fileName = path.basename(candidate.videoPath);
      options.warn?.(`Embedded subtitle extraction failed for ${fileName}: ${message}`);
      await options.onOutcome?.(candidate.trackId, 'failed', message);
      result.failed.push({ trackId: candidate.trackId, error: message });
    }
  }
  return result;
}
