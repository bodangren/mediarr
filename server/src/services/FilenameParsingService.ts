import type { PrismaClient } from '@prisma/client';

/**
 * Parsed movie information from a filename.
 */
export interface ParsedMovieInfo {
  title: string;
  year?: number;
  quality?: string;
  resolution?: string;
  source?: string;
  codec?: string;
  group?: string;
}

/**
 * Match result for a scanned file.
 */
export interface FileMatch {
  path: string;
  size: number;
  parsedMovieTitle?: string;
  parsedYear?: number;
  parsedQuality?: string;
  match?: {
    movieId: number;
    title: string;
    year: number;
    confidence: number; // 0-1
  };
}

/**
 * Service to parse movie information from filenames and match against database.
 */
export class FilenameParsingService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Parse movie info from a filename.
   */
  parseFilename(filename: string): ParsedMovieInfo {
    // Remove extension
    const name = filename.replace(/\.[^.]+$/, '');

    // Common patterns:
    // Movie.Title.2024.1080p.BluRay.x264-GROUP
    // Movie Title (2024) [1080p]
    // Movie.Title.2024.1080p.WEB-DL.DDP5.1.H.264-GROUP

    const result: ParsedMovieInfo = {
      title: '',
    };

    // Extract year (4 digits, typically 1900-2099)
    const yearMatch = name.match(/[\.\s\(\[]?(19\d{2}|20\d{2})[\.\s\)\]]?/);
    if (yearMatch) {
      result.year = parseInt(yearMatch[1], 10);
    }

    // Extract resolution
    const resolutionMatch = name.match(/\d{3,4}p/i);
    if (resolutionMatch) {
      result.resolution = resolutionMatch[0];
    }

    // Extract source (quality source)
    const sourcePatterns = [
      'BluRay', 'BDRip', 'BRRip', 'WEB-DL', 'WEBDL', 'WEBRip', 'HDTV',
      'DVDRip', 'DVD', 'CAM', 'TS', 'TC', 'R5', 'SCR', 'DVDSCR',
    ];
    for (const source of sourcePatterns) {
      if (new RegExp(source, 'i').test(name)) {
        result.source = source;
        break;
      }
    }

    // Extract codec
    const codecMatch = name.match(/x264|x265|h\.?264|h\.?265|hevc|avc|divx|xvid/i);
    if (codecMatch) {
      result.codec = codecMatch[0].toUpperCase();
    }

    // Extract group (typically at the end after -)
    const groupMatch = name.match(/-([A-Z0-9]+)(?:\.[^.]+)?$/i);
    if (groupMatch) {
      result.group = groupMatch[1];
    }

    // Build quality string
    const qualityParts: string[] = [];
    if (result.resolution) qualityParts.push(result.resolution);
    if (result.source) qualityParts.push(result.source);
    if (qualityParts.length > 0) {
      result.quality = qualityParts.join(' ');
    }

    // Extract title (everything before year/quality indicators)
    let title = name;

    // Remove group at end
    title = title.replace(/-([A-Z0-9]+)$/i, '');

    // Remove year and everything after
    if (yearMatch) {
      title = title.substring(0, title.indexOf(yearMatch[1]));
    } else {
      // Remove quality indicators and everything after
      const qualityIndex = title.search(/\d{3,4}p|BluRay|WEB|HDTV|DVD/i);
      if (qualityIndex > 0) {
        title = title.substring(0, qualityIndex);
      }
    }

    // Clean up title
    result.title = title
     .replace(/[._]/g, ' ')  // Replace dots and underscores with spaces
      .replace(/\s+/g, ' ')   // Normalize spaces
      .replace(/^\s+|\s+$/g, '') // Trim
      .trim();

    return result;
  }

  /**
   * Scan a directory for movie files and match against database.
   */
  async scanAndMatch(dirPath: string): Promise<FileMatch[]> {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    const results: FileMatch[] = [];
    const videoExtensions = ['.mkv', '.mp4', '.avi', '.mov', '.wmv', '.m4v'];

    // Get all movies from database for matching
    const movies = await this.prisma.movie.findMany({
      select: {
        id: true,
        title: true,
        year: true,
        cleanTitle: true,
      },
    });

    // Recursively scan directory
    const files = await this.scanDirectory(dirPath, videoExtensions);

    for (const file of files) {
      const stat = await fs.stat(file);
      const filename = path.basename(file);
      const parsed = this.parseFilename(filename);

      // Try to match against database
      const match = this.findBestMatch(parsed, movies);

      results.push({
        path: file,
        size: stat.size,
        parsedMovieTitle: parsed.title || undefined,
        parsedYear: parsed.year,
        parsedQuality: parsed.quality,
        match: match
          ? {
              movieId: match.movie.id,
              title: match.movie.title,
              year: match.movie.year,
              confidence: match.confidence,
            }
          : undefined,
      });
    }

    return results;
  }

  /**
   * Find the best matching movie from the database.
   */
  private findBestMatch(
    parsed: ParsedMovieInfo,
    movies: Array<{ id: number; title: string; year: number; cleanTitle: string }>
  ): { movie: typeof movies[0]; confidence: number } | null {
    if (!parsed.title) return null;

    const normalizedParsedTitle = this.normalizeTitle(parsed.title);
    let bestMatch: { movie: typeof movies[0]; confidence: number } | null = null;

    for (const movie of movies) {
      const normalizedMovieTitle = this.normalizeTitle(movie.title);
      const normalizedCleanTitle = this.normalizeTitle(movie.cleanTitle);

      // Calculate similarity
      let confidence = 0;

      // Title similarity
      if (normalizedParsedTitle === normalizedMovieTitle || 
          normalizedParsedTitle === normalizedCleanTitle) {
        confidence = 1.0;
      } else if (normalizedParsedTitle.includes(normalizedMovieTitle) ||
                 normalizedMovieTitle.includes(normalizedParsedTitle)) {
        confidence = 0.8;
      } else {
        // Calculate Levenshtein-based similarity
        const distance = this.levenshteinDistance(normalizedParsedTitle, normalizedMovieTitle);
        const maxLength = Math.max(normalizedParsedTitle.length, normalizedMovieTitle.length);
        confidence = 1 - distance / maxLength;
      }

      // Year match bonus
      if (parsed.year && movie.year === parsed.year) {
        confidence = Math.min(1.0, confidence + 0.2);
      } else if (parsed.year && Math.abs(movie.year - parsed.year) <= 1) {
        // Allow for year off-by-one
        confidence = Math.min(1.0, confidence + 0.1);
      }

      // Require minimum confidence
      if (confidence >= 0.7 && (!bestMatch || confidence > bestMatch.confidence)) {
        bestMatch = { movie, confidence };
      }
    }

    return bestMatch;
  }

  /**
   * Normalize a title for comparison.
   */
  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace(/^(the|a|an)/, '');
  }

  /**
   * Calculate Levenshtein distance between two strings.
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Recursively scan directory for video files.
   */
  private async scanDirectory(
    dirPath: string,
    extensions: string[]
  ): Promise<string[]> {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const results: string[] = [];

    let entries: import('node:fs').Dirent[];
    try {
      entries = await fs.readdir(dirPath, { withFileTypes: true });
    } catch {
      return results;
    }

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        const subResults = await this.scanDirectory(fullPath, extensions);
        results.push(...subResults);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (extensions.includes(ext)) {
          results.push(fullPath);
        }
      }
    }

    return results;
  }
}
