/**
 * Shared utilities for subtitle provider adapters.
 */

/** All recognized subtitle provider identifiers. */
export const PROVIDER_IDS = {
  OPENSUBTITLES: 'opensubtitles',
  ASSRT: 'assrt',
  SUBDL: 'subdl',
  EMBEDDED: 'embedded',
} as const;

export type ProviderId = (typeof PROVIDER_IDS)[keyof typeof PROVIDER_IDS];

/** File extensions recognized as valid subtitle uploads. */
export const ALLOWED_SUBTITLE_EXTENSIONS = new Set(['.srt', '.ass', '.ssa', '.sub', '.vtt']);

/**
 * Derive a release name from a full file path by stripping the directory
 * components and the final extension.
 */
export function deriveReleaseName(filePath: string): string {
  const filename = filePath.split('/').pop() ?? filePath;
  return filename.replace(/\.[^.]+$/, '');
}

/**
 * Extract the lowercase file extension from a filename.
 * Returns `undefined` if the filename is empty or has no extension.
 */
export function extractExtension(filename?: string): string | undefined {
  if (!filename) {
    return undefined;
  }

  const match = filename.match(/\.[A-Za-z0-9]+$/);
  if (!match) {
    return undefined;
  }

  return match[0].toLowerCase();
}

/**
 * Read a numeric value from a provider-data bag.
 * Accepts both `number` primitives and numeric strings.
 */
export function readNumericProviderData(
  providerData: Record<string, unknown> | undefined,
  key: string,
): number | null {
  const value = providerData?.[key];
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}
