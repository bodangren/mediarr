export interface ParsedInfo {
  seriesTitle?: string | undefined;
  seasonNumber?: number | undefined;
  episodeNumbers: number[];
  quality?: string | undefined;
  year?: number | undefined;
  movieTitle?: string | undefined;
  type?: 'movie' | 'series' | undefined;
}

export interface ParsedDirectory {
  title?: string | undefined;
  year?: number | undefined;
  type?: 'movie' | 'series' | undefined;
}

export interface ParsedMovie {
  title: string;
  year?: number | undefined;
  quality?: string | undefined;
}

export class Parser {
  private static seriesPatterns = [
    /s?(?<season>\d{1,2})[ex](?<episode>\d{1,3})/i,
    /(?<season>\d{1,2})x(?<episode>\d{1,3})/i,
    /season\s+(?<season>\d{1,2})\s+episode\s+(?<episode>\d{1,3})/i,
  ];

  private static yearPattern = /[\.\s\(\[]?(19\d{2}|20\d{2})[\.\s\)\]]?/;

  private static movieFolderPattern = /^(?<title>.+?)\s*\((?<year>19\d{2}|20\d{2})\)\s*$/;

  public static parse(filename: string): ParsedInfo | null {
    for (const pattern of this.seriesPatterns) {
      const match = filename.match(pattern);
      if (match && match.groups) {
        const season = parseInt(match.groups.season, 10);
        const episode = parseInt(match.groups.episode, 10);

        return {
          seasonNumber: season,
          episodeNumbers: [episode],
          seriesTitle: this.extractSeriesTitle(filename, match[0]),
          type: 'series',
        };
      }
    }

    return null;
  }

  public static parseMovie(filename: string): ParsedMovie | null {
    const name = filename.replace(/\.[^.]+$/, '');

    let year: number | undefined;
    const yearMatch = name.match(this.yearPattern);
    if (yearMatch?.[1]) {
      year = parseInt(yearMatch[1], 10);
    }

    let title = name;

    if (year !== undefined && yearMatch) {
      const yearIndex = title.indexOf(yearMatch[1]);
      if (yearIndex > 0) {
        title = title.substring(0, yearIndex);
      }
    } else {
      const qualityIndex = title.search(/\d{3,4}p|BluRay|WEB|HDTV|DVD/i);
      if (qualityIndex > 0) {
        title = title.substring(0, qualityIndex);
      }
    }

    title = title
      .replace(/[._]/g, ' ')
      .replace(/\s*[\(\[\{]\s*$/, '')
      .replace(/\s+/g, ' ')
      .replace(/^\s+|\s+$/g, '')
      .trim();

    if (!title) {
      return null;
    }

    let quality: string | undefined;
    const resolutionMatch = name.match(/\d{3,4}p/i);
    if (resolutionMatch) {
      quality = resolutionMatch[0];
    }

    return {
      title,
      year,
      quality,
    };
  }

  public static parseDirectory(dirName: string): ParsedDirectory {
    const result: ParsedDirectory = {};

    const movieMatch = dirName.match(this.movieFolderPattern);
    if (movieMatch && movieMatch.groups) {
      const title = movieMatch.groups.title;
      const yearStr = movieMatch.groups.year;
      if (title) {
        result.title = title.replace(/[._]/g, ' ').trim();
      }
      if (yearStr && yearStr.length > 0) {
        result.year = parseInt(yearStr, 10);
        result.type = 'movie';
      }
      return result;
    }

    const seasonPattern = /season\s*(\d{1,2})/i;
    if (seasonPattern.test(dirName)) {
      result.type = 'series';
      return result;
    }

    const yearMatch = dirName.match(/\b(19\d{2}|20\d{2})\b/);
    if (yearMatch && yearMatch[1]) {
      result.year = parseInt(yearMatch[1], 10);
    }

    result.title = dirName.replace(/[._]/g, ' ').trim();

    return result;
  }

  private static extractSeriesTitle(filename: string, matchStr: string): string | undefined {
    const index = filename.indexOf(matchStr);
    if (index > 0) {
      let title = filename.substring(0, index);
      title = title.replace(/[._\- ]+$/, '').replace(/[._]/g, ' ').trim();
      return title || undefined;
    }
    return undefined;
  }
}
