export interface ParsedInfo {
  seriesTitle?: string;
  seasonNumber?: number;
  episodeNumbers: number[];
  quality?: string;
  year?: number;
}

/**
 * Simplified parser for TV show filenames.
 * Mimics Sonarr's Parser.cs but in TypeScript with common regex patterns.
 */
export class Parser {
  private static patterns = [
    // S01E01, s01e01, S1E1
    /s?(?<season>\d{1,2})[ex](?<episode>\d{1,3})/i,
    // 1x01, 01x01
    /(?<season>\d{1,2})x(?<episode>\d{1,3})/i,
    // Season 1 Episode 1
    /season\s+(?<season>\d{1,2})\s+episode\s+(?<episode>\d{1,3})/i,
  ];

  public static parse(filename: string): ParsedInfo | null {
    for (const pattern of this.patterns) {
      const match = filename.match(pattern);
      if (match && match.groups) {
        const season = parseInt(match.groups.season, 10);
        const episode = parseInt(match.groups.episode, 10);
        
        return {
          seasonNumber: season,
          episodeNumbers: [episode],
          seriesTitle: this.extractSeriesTitle(filename, match[0])
        };
      }
    }
    return null;
  }

  private static extractSeriesTitle(filename: string, matchStr: string): string | undefined {
    const index = filename.indexOf(matchStr);
    if (index > 0) {
      let title = filename.substring(0, index);
      // Clean up title (remove trailing dots, dashes, spaces)
      title = title.replace(/[._\- ]+$/, '').replace(/[._]/g, ' ').trim();
      return title || undefined;
    }
    return undefined;
  }
}
