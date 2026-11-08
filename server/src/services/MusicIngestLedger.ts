import crypto from 'node:crypto';
import fsp from 'node:fs/promises';

/**
 * Ingest idempotency (track feature_music_library_20261107, Phase 2).
 *
 * Two independent keys: the YouTube video id (never download twice) and the SHA-256 of the converted
 * audio (the same song under another video must not be filed twice). Decisions are pure so the route
 * stays thin and the rules are testable.
 */

export interface ExistingIngest {
  videoId: string;
  audioHash: string | null;
  status: string;
}

export type IngestDecision =
  | { duplicate: false }
  | { duplicate: true; reason: 'video' | 'audio'; existingVideoId: string };

export function decideIngest(
  videoId: string,
  audioHash: string | null,
  existing: readonly ExistingIngest[],
): IngestDecision {
  const byVideo = existing.find((row) => row.videoId === videoId);
  if (byVideo) return { duplicate: true, reason: 'video', existingVideoId: byVideo.videoId };
  if (audioHash !== null && audioHash.length > 0) {
    const byHash = existing.find((row) => row.audioHash === audioHash);
    if (byHash) return { duplicate: true, reason: 'audio', existingVideoId: byHash.videoId };
  }
  return { duplicate: false };
}

/** Streaming SHA-256 so a large m4a is not loaded into memory. */
export async function audioHashOf(file: string): Promise<string> {
  const hash = crypto.createHash('sha256');
  const handle = await fsp.open(file, 'r');
  try {
    for await (const chunk of handle.createReadStream()) {
      hash.update(chunk as Buffer);
    }
  } finally {
    await handle.close();
  }
  return hash.digest('hex');
}
