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
 * Parsed episode information from a filename.
 */
export interface ParsedEpisodeInfo {
  seriesTitle: string;
  seasonNumber?: number;
  episodeNumber?: number;
  absoluteEpisodeNumber?: number;
  endingEpisodeNumber?: number; // For multi-episode files
  year?: number;
  quality?: string;
  resolution?: string;
  source?: string;
  codec?: string;
  group?: string;
}

/**
 * Episode match result for a scanned file.
 */
export interface EpisodeFileMatch {
  path: string;
  size: number;
  parsedSeriesTitle?: string;
  parsedSeasonNumber?: number;
  parsedEpisodeNumber?: number;
  parsedEndingEpisodeNumber?: number;
  parsedQuality?: string;
  match?: {
    seriesId: number;
    seasonId?: number;
    episodeId?: number;
    confidence: number; // 0-1
  };
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
   * Parse episode info from a filename.
   * Supports patterns:
   * - Series.Title.S01E02.1080p.BluRay...
   * - Series Title - 1x02 - Episode Name...
   * - Series.Title.1x02...
   * - Series.Title.E02.1080p... (anime style)
   * - Series.Title.102.1080p... (absolute numbering)
   */
  parseEpisodeFilename(filename: string): ParsedEpisodeInfo {
    // Remove extension
    const name = filename.replace(/\.[^.]+$/, '');

    const result: ParsedEpisodeInfo = {
      seriesTitle: '',
    };

    // Pattern 1: S01E02 or S01E02E03 (multi-episode)
    let seasonEpisodeMatch = name.match(/\.?S(\d{1,2})E(\d{1,3})(?:-?E(\d{1,3}))?\.?/i);
    
    if (seasonEpisodeMatch) {
      result.seasonNumber = parseInt(seasonEpisodeMatch[1], 10);
      result.episodeNumber = parseInt(seasonEpisodeMatch[2], 10);
      if (seasonEpisodeMatch[3]) {
        result.endingEpisodeNumber = parseInt(seasonEpisodeMatch[3], 10);
      }
    }

    // Pattern 2: 1x02 or 1x02-1x03 (multi-episode)
    if (!seasonEpisodeMatch) {
      seasonEpisodeMatch = name.match(/[.\s-](\d{1,2})x(\d{1,3})(?:-\d{1,2}x(\d{1,3}))?[.\s-]/i);
      if (seasonEpisodeMatch) {
        result.seasonNumber = parseInt(seasonEpisodeMatch[1], 10);
        result.episodeNumber = parseInt(seasonEpisodeMatch[2], 10);
        if (seasonEpisodeMatch[3]) {
          result.endingEpisodeNumber = parseInt(seasonEpisodeMatch[3], 10);
        }
      }
    }

    // Pattern 3: E02 or Ep02 (anime style - single season)
    if (!seasonEpisodeMatch) {
      const episodeOnlyMatch = name.match(/[.\s]E(?:p)?(\d{1,4})[.\s]/i);
      if (episodeOnlyMatch) {
        result.episodeNumber = parseInt(episodeOnlyMatch[1], 10);
        result.seasonNumber = 1;
      }
    }

    // Pattern 4: 102 (absolute numbering like 1x02)
    if (!seasonEpisodeMatch) {
      const absoluteMatch = name.match(/[.\s](\d{3,4})[.\s]/);
      if (absoluteMatch) {
        const num = parseInt(absoluteMatch[1], 10);
        if (num >= 100 && num < 10000) {
          result.seasonNumber = Math.floor(num / 100);
          result.episodeNumber = num % 100;
          result.absoluteEpisodeNumber = num;
        }
      }
    }

    // Extract year (4 digits, typically 1900-2099) - for series year
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

    // Extract series title (everything before season/episode indicators)
    let title = name;

    // Remove group at end
    title = title.replace(/-([A-Z0-9]+)$/i, '');

    // Find the position of season/episode pattern
    const seasonEpisodeIndex = title.search(/\.?S\d{1,2}E\d{1,3}|[.\s-]\d{1,2}x\d{1,3}|[.\s]E(?:p)?\d{1,4}[.\s]|[.\s]\d{3,4}[.\s]/i);
    
    if (seasonEpisodeIndex > 0) {
      title = title.substring(0, seasonEpisodeIndex);
    } else {
      // Fallback: remove quality indicators and everything after
      const qualityIndex = title.search(/\d{3,4}p|BluRay|WEB|HDTV|DVD/i);
      if (qualityIndex > 0) {
        title = title.substring(0, qualityIndex);
      }
    }

    // Clean up title
    result.seriesTitle = title
      .replace(/[._]/g, ' ')  // Replace dots and underscores with spaces
      .replace(/\s+/g, ' ')   // Normalize spaces
      .replace(/^\s+|\s+$/g, '') // Trim
      .trim();

    return result;
  }

  /**
   * Scan a directory for episode files and match against database.
   */
  async scanAndMatchEpisodes(dirPath: string): Promise<EpisodeFileMatch[]> {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    const results: EpisodeFileMatch[] = [];
    const videoExtensions = ['.mkv', '.mp4', '.avi', '.mov', '.wmv', '.m4v'];

    // Get all series and episodes from database for matching
    const series = await (this.prisma as any).series.findMany({
      select: {
        id: true,
        title: true,
        year: true,
        cleanTitle: true,
        seasons: {
          include: {
            episodes: {
              select: {
                id: true,
                seasonNumber: true,
                episodeNumber: true,
                title: true,
              },
            },
          },
        },
      },
    });

    // Recursively scan directory
    const files = await this.scanDirectory(dirPath, videoExtensions);

    for (const file of files) {
      const stat = await fs.stat(file);
      const filename = path.basename(file);
      const parsed = this.parseEpisodeFilename(filename);

      // Try to match against database
      const match = this.findBestEpisodeMatch(parsed, series);

      results.push({
        path: file,
        size: stat.size,
        parsedSeriesTitle: parsed.seriesTitle || undefined,
        parsedSeasonNumber: parsed.seasonNumber,
        parsedEpisodeNumber: parsed.episodeNumber,
        parsedEndingEpisodeNumber: parsed.endingEpisodeNumber,
        parsedQuality: parsed.quality,
        match: match
          ? {
              seriesId: match.series.id,
              seasonId: match.seasonId,
              episodeId: match.episodeId,
              confidence: match.confidence,
            }
          : undefined,
      });
    }

    return results;
  }

  /**
   * Find the best matching series and episode from the database.
   */
  private findBestEpisodeMatch(
    parsed: ParsedEpisodeInfo,
    series: Array<{
      id: number;
      title: string;
      year: number;
      cleanTitle: string;
      seasons: Array<{
        id: number;
        seasonNumber: number;
        episodes: Array<{
          id: number;
          seasonNumber: number;
          episodeNumber: number;
          title: string;
        }>;
      }>;
    }>
  ): { series: typeof series[0]; seasonId?: number; episodeId?: number; confidence: number } | null {
    if (!parsed.seriesTitle) return null;

    const normalizedParsedTitle = this.normalizeTitle(parsed.seriesTitle);
    let bestMatch: { series: typeof series[0]; seasonId?: number; episodeId?: number; confidence: number } | null = null;

    for (const s of series) {
      const normalizedSeriesTitle = this.normalizeTitle(s.title);
      const normalizedCleanTitle = this.normalizeTitle(s.cleanTitle);

      // Calculate series similarity
      let confidence = 0;

      // Title similarity
      if (normalizedParsedTitle === normalizedSeriesTitle || 
          normalizedParsedTitle === normalizedCleanTitle) {
        confidence = 1.0;
      } else if (normalizedParsedTitle.includes(normalizedSeriesTitle) ||
                 normalizedSeriesTitle.includes(normalizedParsedTitle)) {
        confidence = 0.8;
      } else {
        // Calculate Levenshtein-based similarity
        const distance = this.levenshteinDistance(normalizedParsedTitle, normalizedSeriesTitle);
        const maxLength = Math.max(normalizedParsedTitle.length, normalizedSeriesTitle.length);
        confidence = 1 - distance / maxLength;
      }

      // Year match bonus
      if (parsed.year && s.year === parsed.year) {
        confidence = Math.min(1.0, confidence + 0.1);
      }

      // If we have season/episode info, try to find the episode
      let seasonId: number | undefined;
      let episodeId: number | undefined;

      if (parsed.seasonNumber !== undefined && parsed.episodeNumber !== undefined && confidence >= 0.6) {
        for (const season of s.seasons) {
          if (season.seasonNumber === parsed.seasonNumber) {
            seasonId = season.id;
            for (const episode of season.episodes) {
              if (episode.episodeNumber === parsed.episodeNumber) {
                episodeId = episode.id;
                // Bonus for matching episode
                confidence = Math.min(1.0, confidence + 0.1);
                break;
              }
            }
            break;
          }
        }
      }

      // Require minimum confidence
      if (confidence >= 0.65 && (!bestMatch || confidence > bestMatch.confidence)) {
        bestMatch = { series: s, seasonId, episodeId, confidence };
      }
    }

    return bestMatch;
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
