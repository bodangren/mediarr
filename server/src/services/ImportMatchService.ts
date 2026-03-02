import type { MetadataProvider } from './MetadataProvider';
import type { ScannedFolder, NfoData } from './ExistingLibraryScanner';
import type { BaseMedia } from '../types/BaseMedia';

type MetadataProviderDeps = Pick<MetadataProvider, 'searchMedia' | 'findMovieByImdbId'>;

export interface MatchCandidate {
  id: number;
  title: string;
  year?: number | undefined;
  overview?: string | undefined;
  posterUrl?: string | undefined;
  confidence: number;
  matchSource: 'nfo' | 'search' | 'exact';
}

export interface ScannedFolderWithMatches extends ScannedFolder {
  matchCandidates: MatchCandidate[];
  selectedMatchId?: number | undefined;
}

export class ImportMatchService {
  constructor(private readonly metadataProvider: MetadataProviderDeps) {}

  async matchFolder(folder: ScannedFolder): Promise<MatchCandidate[]> {
    const title = folder.parsedTitle ?? this.extractTitleFromFiles(folder);
    if (!title) {
      return [];
    }

    if (folder.type === 'series') {
      return this.matchByMediaType('TV', title, folder.parsedYear, folder.nfoData);
    } else if (folder.type === 'movie') {
      return this.matchByMediaType('MOVIE', title, folder.parsedYear, folder.nfoData);
    }

    return [];
  }

  private async matchByMediaType(
    mediaType: 'MOVIE' | 'TV',
    title: string,
    year?: number,
    nfoData?: NfoData,
  ): Promise<MatchCandidate[]> {
    // NFO resolution and title search run concurrently
    const [nfoCandidate, searchCandidates] = await Promise.all([
      this.resolveNfoCandidate(mediaType, title, year, nfoData),
      this.metadataProvider
        .searchMedia({ term: title, mediaType })
        .then((results) => results.slice(0, 5).map((r) => this.mediaResultToCandidate(r, title, year)))
        .catch((error) => {
          console.error(`Failed to search ${mediaType}:`, error);
          return [] as MatchCandidate[];
        }),
    ]);

    const candidates: MatchCandidate[] = [];

    if (nfoCandidate) {
      candidates.push(nfoCandidate);
    }

    for (const candidate of searchCandidates) {
      if (!candidates.some((c) => c.id === candidate.id)) {
        candidates.push(candidate);
      }
    }

    return candidates.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  }

  private async resolveNfoCandidate(
    mediaType: 'MOVIE' | 'TV',
    title: string,
    year?: number,
    nfoData?: NfoData,
  ): Promise<MatchCandidate | null> {
    if (mediaType === 'MOVIE') {
      if (nfoData?.tmdbId) {
        return {
          id: nfoData.tmdbId,
          title: nfoData.title ?? title,
          year: nfoData.year ?? year,
          confidence: 1.0,
          matchSource: 'nfo',
        };
      }

      if (nfoData?.imdbId) {
        try {
          const resolved = await this.metadataProvider.findMovieByImdbId(nfoData.imdbId);
          if (resolved?.tmdbId) {
            return {
              id: resolved.tmdbId,
              title: nfoData.title ?? resolved.title ?? title,
              year: nfoData.year ?? resolved.year ?? year,
              overview: resolved.overview,
              posterUrl: resolved.images?.[0]?.url,
              confidence: 1.0,
              matchSource: 'nfo',
            };
          }
        } catch (error) {
          console.error('Failed to resolve movie by IMDb ID:', error);
        }
      }
    } else if (nfoData?.tvdbId) {
      return {
        id: nfoData.tvdbId,
        title: nfoData.title ?? title,
        year: nfoData.year ?? year,
        confidence: 1.0,
        matchSource: 'nfo',
      };
    }

    return null;
  }

  private mediaResultToCandidate(result: BaseMedia, parsedTitle: string, parsedYear?: number): MatchCandidate {
    let confidence = this.calculateTitleConfidence(parsedTitle, result.title);

    if (parsedYear && result.year) {
      if (parsedYear === result.year) {
        confidence = Math.min(1.0, confidence + 0.15);
      } else if (Math.abs(parsedYear - result.year) <= 1) {
        confidence = Math.min(1.0, confidence + 0.05);
      }
    }

    const id = result.mediaType === 'MOVIE' ? result.tmdbId : result.tvdbId;

    return {
      id: id ?? 0,
      title: result.title,
      year: result.year,
      overview: result.overview,
      posterUrl: result.images?.[0]?.url,
      confidence,
      matchSource: confidence >= 0.95 ? 'exact' : 'search',
    };
  }

  private calculateTitleConfidence(parsed: string, result: string): number {
    const normalizedParsed = this.normalizeTitle(parsed);
    const normalizedResult = this.normalizeTitle(result);

    if (normalizedParsed === normalizedResult) {
      return 1.0;
    }

    if (normalizedParsed.includes(normalizedResult) || normalizedResult.includes(normalizedParsed)) {
      const lengthRatio =
        Math.min(normalizedParsed.length, normalizedResult.length) /
        Math.max(normalizedParsed.length, normalizedResult.length);
      return 0.7 + lengthRatio * 0.25;
    }

    const distance = this.levenshteinDistance(normalizedParsed, normalizedResult);
    const maxLen = Math.max(normalizedParsed.length, normalizedResult.length);
    if (maxLen === 0) return 0;

    return Math.max(0, 1 - distance / maxLen);
  }

  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace(/^(the|a|an)/, '');
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0]![j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i]![j] = matrix[i - 1]![j - 1]!;
        } else {
          matrix[i]![j] = Math.min(
            matrix[i - 1]![j - 1]! + 1,
            matrix[i]![j - 1]! + 1,
            matrix[i - 1]![j]! + 1,
          );
        }
      }
    }

    return matrix[b.length]![a.length]!;
  }

  private extractTitleFromFiles(folder: ScannedFolder): string | undefined {
    if (folder.files.length === 0) {
      return undefined;
    }

    const titles = folder.files
      .map((f) => f.parsedInfo?.seriesTitle ?? f.parsedInfo?.movieTitle)
      .filter((t): t is string => Boolean(t));

    if (titles.length === 0) {
      return undefined;
    }

    const counts = new Map<string, number>();
    for (const title of titles) {
      counts.set(title, (counts.get(title) ?? 0) + 1);
    }

    let maxCount = 0;
    let mostCommon: string | undefined;
    for (const [title, count] of counts) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = title;
      }
    }

    return mostCommon;
  }
}
