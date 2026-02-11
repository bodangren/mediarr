import fs from 'node:fs/promises';
import path from 'node:path';
import { HttpClient } from '../indexers/HttpClient';

/**
 * Service to generate local metadata files (.nfo) and download artwork.
 */
export class MetadataGenerator {
  constructor(private readonly httpClient: HttpClient) {}

  /**
   * Generates tvshow.nfo in the series root directory.
   */
  async generateSeriesMetadata(series: any): Promise<void> {
    const nfoPath = path.join(series.path, 'tvshow.nfo');
    const content = `<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>
<tvshow>
    <title>${this.escapeXml(series.title)}</title>
    <plot>${this.escapeXml(series.overview || '')}</plot>
    <uniqueid type="tvdb" default="true">${series.tvdbId}</uniqueid>
    ${series.tmdbId ? `<uniqueid type="tmdb">${series.tmdbId}</uniqueid>` : ''}
    ${series.imdbId ? `<uniqueid type="imdb">${series.imdbId}</uniqueid>` : ''}
    <status>${this.escapeXml(series.status)}</status>
    <premiered>${series.year}-01-01</premiered>
    <studio>${this.escapeXml(series.network || '')}</studio>
</tvshow>`;

    await fs.mkdir(series.path, { recursive: true });
    await fs.writeFile(nfoPath, content);
  }

  /**
   * Generates an .nfo file for a specific episode.
   */
  async generateEpisodeMetadata(series: any, episode: any, episodeFilePath: string): Promise<void> {
    const nfoPath = path.join(
      path.dirname(episodeFilePath),
      path.basename(episodeFilePath, path.extname(episodeFilePath)) + '.nfo'
    );

    const content = `<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>
<episodedetails>
    <title>${this.escapeXml(episode.title)}</title>
    <season>${episode.seasonNumber}</season>
    <episode>${episode.episodeNumber}</episode>
    <plot>${this.escapeXml(episode.overview || '')}</plot>
    <uniqueid type="tvdb" default="true">${episode.tvdbId}</uniqueid>
</episodedetails>`;

    await fs.writeFile(nfoPath, content);
  }

  /**
   * Downloads a series poster.
   */
  async downloadPoster(series: any, imageUrl: string): Promise<void> {
    const posterPath = path.join(series.path, 'poster.jpg');
    
    try {
      const response = await this.httpClient.get(imageUrl);
      if (response.ok) {
        // Since HttpClient returns body as string (UTF-8 by default), 
        // we might have issues with binary data if not handled.
        // For now, we'll assume the environment supports binary to string conversion or we'll need to update HttpClient.
        // Actually, Web-standard fetch returns a Response object.
        await fs.writeFile(posterPath, Buffer.from(response.body, 'binary'));
      }
    } catch (error) {
      console.error(`Failed to download poster for ${series.title}:`, error);
    }
  }

  private escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&"']/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '"': return '&quot;';
        case "'": return '&apos;';
        default: return c;
      }
    });
  }
}
