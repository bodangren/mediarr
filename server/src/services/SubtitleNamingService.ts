import path from 'node:path';

export interface SubtitleNamingInput {
  videoPath: string;
  languageCode: string;
  isForced: boolean;
  isHi: boolean;
  extension?: string;
  variantToken: string;
  existingPaths?: string[];
  subtitleDirectory?: string;
}

/**
 * Builds deterministic subtitle filenames and appends a variant suffix on collision.
 */
export class SubtitleNamingService {
  buildSubtitlePath(input: SubtitleNamingInput): string {
    const extension = input.extension?.startsWith('.')
      ? input.extension
      : `.${input.extension ?? 'srt'}`;
    const dir = input.subtitleDirectory
      ? path.resolve(input.subtitleDirectory)
      : path.dirname(input.videoPath);
    const videoBaseName = path.basename(
      input.videoPath,
      path.extname(input.videoPath),
    );
    const flags = [
      input.isForced ? 'forced' : null,
      input.isHi ? 'hi' : null,
    ].filter((flag): flag is string => Boolean(flag));
    const languageSuffix = flags.length > 0
      ? `${input.languageCode.toLowerCase()}.${flags.join('.')}`
      : input.languageCode.toLowerCase();
    const standardName = `${videoBaseName}.${languageSuffix}${extension}`;
    const standardPath = path.join(dir, standardName);

    const existing = new Set((input.existingPaths ?? []).map(item => item));
    if (!existing.has(standardPath)) {
      return standardPath;
    }

    const token = this.sanitizeVariantToken(input.variantToken);
    const variantName = `${videoBaseName}.${token}.${languageSuffix}${extension}`;
    return path.join(dir, variantName);
  }

  private sanitizeVariantToken(token: string): string {
    const sanitized = token
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return sanitized || 'variant';
  }
}
