import fs from 'node:fs';

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
  try {
    const sourceStats = fs.statSync(sourcePath);
    const destStats = fs.statSync(destPath);
    return sourceStats.dev === destStats.dev;
  } catch {
    return false;
  }
}