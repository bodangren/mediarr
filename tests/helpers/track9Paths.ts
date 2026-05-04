import fs from 'node:fs';
import path from 'node:path';

const TRACK_ID = 'clone_parity_gap_investigation_20260212';

export function resolveTrack9Root(): string {
  const activeTrackRoot = path.join(process.cwd(), 'measure', 'tracks', TRACK_ID);
  if (fs.existsSync(activeTrackRoot)) {
    return activeTrackRoot;
  }

  const archivedTrackRoot = path.join(process.cwd(), 'measure', 'archive', TRACK_ID);
  if (fs.existsSync(archivedTrackRoot)) {
    return archivedTrackRoot;
  }

  throw new Error(`Unable to locate ${TRACK_ID} under measure/tracks or measure/archive`);
}

export function resolveTrack9ArtifactPath(fileName: string): string {
  return path.join(resolveTrack9Root(), 'artifacts', fileName);
}
