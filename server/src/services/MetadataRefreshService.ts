import { eq, isNull, or } from 'drizzle-orm';
import { movies, series } from '../db/schema';
import type { DatabaseClient } from '../db/drizzleClient';
import type { MetadataProvider } from './MetadataProvider';

export interface MetadataRefreshSummary {
  moviesScanned: number;
  seriesScanned: number;
  moviesRefreshed: number;
  seriesRefreshed: number;
  failures: number;
  durationMs: number;
}

interface ArtworkPatch {
  posterUrl?: string | undefined;
  backdropUrl?: string | undefined;
  overview?: string | undefined;
}

/**
 * Backfills posterUrl, backdropUrl, and overview for library items that a
 * filesystem scan inserted without artwork metadata.
 *
 * Movies resolve through TMDB (poster at w500, backdrop at w1280). Series
 * resolve through the SkyHook TVDB proxy, which needs no API key. Per-item
 * failures are counted, never thrown from {@link refreshAll}: one dead
 * provider must not take the refresh run (or the server) down with it.
 */
export class MetadataRefreshService {
  constructor(
    private readonly prisma: Pick<DatabaseClient, 'drizzle'>,
    private readonly metadataProvider: MetadataProvider,
  ) {}

  async refreshAll(fetchFn?: any): Promise<MetadataRefreshSummary> {
    const start = Date.now();
    const db = this.prisma.drizzle;
    const [movieRows, seriesRows] = await Promise.all([
      db
        .select({
          id: movies.id,
          posterUrl: movies.posterUrl,
          backdropUrl: movies.backdropUrl,
          overview: movies.overview,
        })
        .from(movies)
        .where(
          or(isNull(movies.posterUrl), isNull(movies.backdropUrl), isNull(movies.overview)),
        )
        .all(),
      db
        .select({
          id: series.id,
          posterUrl: series.posterUrl,
          backdropUrl: series.backdropUrl,
          overview: series.overview,
        })
        .from(series)
        .where(
          or(isNull(series.posterUrl), isNull(series.backdropUrl), isNull(series.overview)),
        )
        .all(),
    ]);

    const summary: MetadataRefreshSummary = {
      moviesScanned: movieRows.length,
      seriesScanned: seriesRows.length,
      moviesRefreshed: 0,
      seriesRefreshed: 0,
      failures: 0,
      durationMs: 0,
    };

    for (const row of movieRows) {
      try {
        if (await this.refreshMovie(row.id, fetchFn)) {
          summary.moviesRefreshed += 1;
        }
      } catch (error) {
        summary.failures += 1;
        console.error(`[MetadataRefreshService] movie ${row.id} refresh failed:`, error);
      }
    }

    for (const row of seriesRows) {
      try {
        if (await this.refreshSeries(row.id, fetchFn)) {
          summary.seriesRefreshed += 1;
        }
      } catch (error) {
        summary.failures += 1;
        console.error(`[MetadataRefreshService] series ${row.id} refresh failed:`, error);
      }
    }

    summary.durationMs = Date.now() - start;
    return summary;
  }

  /**
   * Refresh one movie. Returns true when a row changed. Missing fields only:
   * a populated field is never overwritten. Throws on provider failure so the
   * single-item caller sees the cause; {@link refreshAll} catches per item.
   */
  async refreshMovie(movieId: number, fetchFn?: any): Promise<boolean> {
    const db = this.prisma.drizzle;
    const row = db
      .select({
        id: movies.id,
        tmdbId: movies.tmdbId,
        posterUrl: movies.posterUrl,
        backdropUrl: movies.backdropUrl,
        overview: movies.overview,
      })
      .from(movies)
      .where(eq(movies.id, movieId))
      .get();

    if (!row) {
      throw new Error(`Movie ${movieId} not found`);
    }

    if (this.isComplete(row)) {
      return false;
    }

    const artwork = await this.metadataProvider.getMovieArtwork(row.tmdbId, fetchFn);
    const patch = this.buildPatch(row, artwork);
    if (!patch) {
      return false;
    }

    db.update(movies).set(patch).where(eq(movies.id, movieId)).run();
    return true;
  }

  /**
   * Refresh one series. Same contract as {@link refreshMovie}.
   */
  async refreshSeries(seriesId: number, fetchFn?: any): Promise<boolean> {
    const db = this.prisma.drizzle;
    const row = db
      .select({
        id: series.id,
        tvdbId: series.tvdbId,
        posterUrl: series.posterUrl,
        backdropUrl: series.backdropUrl,
        overview: series.overview,
      })
      .from(series)
      .where(eq(series.id, seriesId))
      .get();

    if (!row) {
      throw new Error(`Series ${seriesId} not found`);
    }

    if (this.isComplete(row)) {
      return false;
    }

    const { series: details } = await this.metadataProvider.getSeriesDetails(row.tvdbId, fetchFn);
    const images = Array.isArray(details.images) ? details.images : [];
    // SkyHook reports TVDB cover types in title case ("Poster", "Fanart"),
    // so match case-insensitively. A case-sensitive lookup silently found
    // nothing and every series kept a null backdropUrl.
    const byCoverType = (wanted: string) =>
      images.find(image => image.coverType?.toLowerCase() === wanted);
    const poster = byCoverType('poster');
    const backdrop = byCoverType('fanart') ?? byCoverType('background');

    const patch = this.buildPatch(row, {
      posterUrl: poster?.url,
      backdropUrl: backdrop?.url,
      overview: details.overview,
    });
    if (!patch) {
      return false;
    }

    db.update(series).set(patch).where(eq(series.id, seriesId)).run();
    return true;
  }

  private isComplete(row: { posterUrl: string | null; backdropUrl: string | null; overview: string | null }): boolean {
    return row.posterUrl != null && row.backdropUrl != null && row.overview != null;
  }

  private buildPatch(
    row: { posterUrl: string | null; backdropUrl: string | null; overview: string | null },
    artwork: ArtworkPatch,
  ): Record<string, string> | null {
    const patch: Record<string, string> = {};
    if (row.posterUrl == null && artwork.posterUrl) {
      patch.posterUrl = artwork.posterUrl;
    }
    if (row.backdropUrl == null && artwork.backdropUrl) {
      patch.backdropUrl = artwork.backdropUrl;
    }
    if (row.overview == null && artwork.overview) {
      patch.overview = artwork.overview;
    }
    return Object.keys(patch).length > 0 ? patch : null;
  }
}
