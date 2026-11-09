import type { FastifyInstance } from 'fastify';
import { asc, sql } from 'drizzle-orm';
import * as schema from '../../db/schema';
import { sendSuccess } from '../contracts';
import type { ApiDependencies } from '../types';

type LibrarySearchType = 'all' | 'movie' | 'series' | 'episode';

interface LibrarySearchItem {
  type: 'movie' | 'series' | 'episode';
  id: number;
  title: string;
  year: number | null;
  posterUrl: string | null;
  subtitle: string | null;
  seriesId: number | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
}

/**
 * Server-side unified library search (Kimi home/search review): the TV previously loaded both full
 * libraries and filtered titles locally, so search could not scale, rank or include episodes.
 *
 * SQLite's LIKE is case-sensitive under this build's pragma, so every comparison lower-cases both sides.
 */
export function registerLibrarySearchRoutes(app: FastifyInstance, deps: ApiDependencies): void {
  app.get('/api/library/search', {
    schema: {
      querystring: {
        type: 'object',
        required: ['q'],
        properties: {
          q: { type: 'string', minLength: 1 },
          type: { type: 'string', enum: ['all', 'movie', 'series', 'episode'] },
          limit: { type: ['number', 'string'] },
        },
      },
    },
  }, async (request, reply) => {
    const query = request.query as { q: string; type?: LibrarySearchType; limit?: number | string };
    const term = query.q.trim();
    const limit = Math.max(1, Math.min(50, Number.parseInt(String(query.limit ?? '30'), 10) || 30));
    const type: LibrarySearchType = query.type ?? 'all';
    const drizzle = (deps.prisma as unknown as { drizzle: any }).drizzle;
    const pattern = `%${term.toLowerCase().replace(/[%_]/g, '')}%`;
    const items: LibrarySearchItem[] = [];

    if (type === 'all' || type === 'movie') {
      const movies = await drizzle
        .select({
          id: schema.movies.id,
          title: schema.movies.title,
          year: schema.movies.year,
          posterUrl: schema.movies.posterUrl,
        })
        .from(schema.movies)
        .where(sql`lower(${schema.movies.title}) LIKE ${pattern}`)
        .orderBy(asc(schema.movies.sortTitle))
        .limit(limit);
      for (const movie of movies as Array<{ id: number; title: string; year: number | null; posterUrl: string | null }>) {
        items.push({
          type: 'movie', id: movie.id, title: movie.title, year: movie.year,
          posterUrl: movie.posterUrl, subtitle: null, seriesId: null,
          seasonNumber: null, episodeNumber: null,
        });
      }
    }

    if (type === 'all' || type === 'series') {
      const seriesRows = await drizzle
        .select({
          id: schema.series.id,
          title: schema.series.title,
          year: schema.series.year,
          posterUrl: schema.series.posterUrl,
        })
        .from(schema.series)
        .where(sql`lower(${schema.series.title}) LIKE ${pattern}`)
        .orderBy(asc(schema.series.sortTitle))
        .limit(limit);
      for (const s of seriesRows as Array<{ id: number; title: string; year: number | null; posterUrl: string | null }>) {
        items.push({
          type: 'series', id: s.id, title: s.title, year: s.year, posterUrl: s.posterUrl,
          subtitle: null, seriesId: null, seasonNumber: null, episodeNumber: null,
        });
      }
    }

    if (type === 'all' || type === 'episode') {
      const episodes = await drizzle
        .select({
          id: schema.episodes.id,
          title: schema.episodes.title,
          seasonNumber: schema.episodes.seasonNumber,
          episodeNumber: schema.episodes.episodeNumber,
          seriesId: schema.series.id,
          seriesTitle: schema.series.title,
          seriesPosterUrl: schema.series.posterUrl,
        })
        .from(schema.episodes)
        .leftJoin(schema.series, sql`${schema.series.id} = ${schema.episodes.seriesId}`)
        .where(sql`lower(${schema.episodes.title}) LIKE ${pattern}`)
        .orderBy(asc(schema.episodes.seriesId), asc(schema.episodes.seasonNumber), asc(schema.episodes.episodeNumber))
        .limit(limit);
      for (const episode of episodes as Array<{
        id: number; title: string | null; seasonNumber: number; episodeNumber: number;
        seriesId: number | null; seriesTitle: string | null; seriesPosterUrl: string | null;
      }>) {
        items.push({
          type: 'episode',
          id: episode.id,
          title: episode.title ?? `Episode ${episode.episodeNumber}`,
          year: null,
          posterUrl: episode.seriesPosterUrl ?? null,
          subtitle: episode.seriesTitle ?? null,
          seriesId: episode.seriesId,
          seasonNumber: episode.seasonNumber,
          episodeNumber: episode.episodeNumber,
        });
      }
    }

    return sendSuccess(reply, { items, count: items.length, query: term });
  });
}
