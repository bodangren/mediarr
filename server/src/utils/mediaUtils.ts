import fs from 'node:fs';
import path from 'node:path';

export function inferRootFolderType(path: string): 'movie' | 'series' | null {
  if (!path || typeof path !== 'string') {
    return null;
  }

  const normalized = path.toLowerCase();

  if (normalized.includes('/movies') || normalized.endsWith('movies')) {
    return 'movie';
  }

  if (
    normalized.includes('/tv') ||
    normalized.includes('/television') ||
    normalized.includes('/shows') ||
    normalized.includes('/series') ||
    normalized.endsWith('tv')
  ) {
    return 'series';
  }

  return null;
}

export async function isSameVolume(sourcePath: string, destPath: string): Promise<boolean> {
  const sourceDevice = getDeviceId(sourcePath, false);
  const destinationDevice = getDeviceId(destPath, true);
  return sourceDevice !== null && destinationDevice !== null && sourceDevice === destinationDevice;
}

function getDeviceId(targetPath: string, useExistingAncestor: boolean): number | null {
  let candidate = path.resolve(targetPath);

  while (true) {
    try {
      return fs.statSync(candidate).dev;
    } catch (error: unknown) {
      if (!useExistingAncestor || !isMissingPathError(error)) {
        return null;
      }

      const parent = path.dirname(candidate);
      if (parent === candidate) {
        return null;
      }
      candidate = parent;
    }
  }
}

function isMissingPathError(error: unknown): boolean {
  return error instanceof Error && 'code' in error &&
    (error.code === 'ENOENT' || error.code === 'ENOTDIR');
}
