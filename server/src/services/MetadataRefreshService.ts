import { eq, isNull, like, or } from 'drizzle-orm';
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

/**
 * True when [url] is a genuine portrait poster.
 *
 * TVDB serves two very different artworks: `posters/<id>-N.jpg` (680x1000,
 * portrait) and `graphical/<id>-gN.jpg` (a wide title logo). Bulk import used to
 * take `images[0]`, which is frequently the graphical one, so 23 series ended up
 * with a wide logo in their poster column and rendered as a letterboxed strip on
 * a 2:3 tile (owner report 2026-11-16).
 */
export function isPortraitPoster(url: string | null): boolean {
  if (url == null || url.trim() === '') return false;
  const lower = url.toLowerCase();
  // TVDB serves the wide title card under /banners/graphical/ and the portrait
  // poster under /banners/posters/. Do NOT reject on a bare '/banner' substring:
  // every TVDB URL contains '/banners/' (that mistake made this predicate reject
  // the real posters and the repair pass changed nothing).
  if (lower.includes('/graphical/')) return false;
  if (lower.includes('clearlogo') || lower.includes('/logo')) return false;
  // TVDB also serves plain text-only title cards under /banners/text/.
  if (lower.includes('/banners/text/') || lower.includes('/text/')) return false;
  // Fanart/background artwork is landscape by definition.
  if (lower.includes('/fanart/') || lower.includes('/backgrounds/')) return false;
  return true;
}

/**
 * Picks the best portrait poster from a provider image list.
 *
 * Prefers the `Poster` cover type and never returns a graphical/logo/banner
 * image; falls back to any image that is not one of those.
 */
/**
 * True when [url] is the canonical portrait poster for its provider.
 *
 * TVDB publishes posters under `/banners/posters/`, but also serves arbitrary
 * artwork under `/banners/v4/series/<id>/banners/<hash>` whose type is unknown
 * from the URL — several of those render as a plain text title card on the 2:3
 * tile (owner report 2026-11-17: "Some TV series lack a proper poster"). TMDB
 * posters are canonical by construction.
 */
export function isCanonicalPoster(url: string | null): boolean {
  if (!isPortraitPoster(url)) return false;
  const lower = (url as string).toLowerCase();
  return lower.includes('/posters/') || lower.includes('image.tmdb.org');
}

export function pickPosterUrl(
  images: Array<{ url?: string | null; coverType?: string | null }> | undefined | null,
): string | undefined {
  if (!Array.isArray(images) || images.length === 0) return undefined;
  const poster = images.find(
    image =>
      (image.coverType ?? '').toLowerCase() === 'poster' && isPortraitPoster(image.url ?? null),
  );
  if (poster?.url) return poster.url;
  const anyPortrait = images.find(image => isPortraitPoster(image.url ?? null));
  return anyPortrait?.url ?? undefined;
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
          or(
            isNull(movies.posterUrl),
            isNull(movies.backdropUrl),
            isNull(movies.overview),
            // A graphical/logo "poster" is not a portrait poster: re-fetch it so
            // existing rows heal instead of only new imports being correct.
            like(movies.posterUrl, '%graphical%'),
            like(movies.posterUrl, '%logo%'),
            like(movies.posterUrl, '%/text/%'),
            like(movies.posterUrl, '%banners/v4/%'),
            like(movies.posterUrl, '%/banners/series/%'),
          ),
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
          or(
            isNull(series.posterUrl),
            isNull(series.backdropUrl),
            isNull(series.overview),
            like(series.posterUrl, '%graphical%'),
            like(series.posterUrl, '%logo%'),
            like(series.posterUrl, '%/text/%'),
            like(series.posterUrl, '%banners/v4/%'),
            like(series.posterUrl, '%/banners/series/%'),
          ),
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
    return isCanonicalPoster(row.posterUrl) && row.backdropUrl != null && row.overview != null;
  }

  private buildPatch(
    row: { posterUrl: string | null; backdropUrl: string | null; overview: string | null },
    artwork: ArtworkPatch,
  ): Record<string, string> | null {
    const patch: Record<string, string> = {};
    // A graphical/logo/banner image is a wide title card, not a portrait
    // poster: on a 2:3 tile it renders as an unreadable letterboxed strip (owner
    // report 2026-11-16: "poster image frames are portrait, but the images
    // themselves are landscape"). Replace it and never write one back.
    if (!isCanonicalPoster(row.posterUrl) && isCanonicalPoster(artwork.posterUrl ?? null)) {
      patch.posterUrl = artwork.posterUrl as string;
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
