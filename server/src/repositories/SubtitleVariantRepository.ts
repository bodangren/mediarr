import fs from 'node:fs/promises';
import { and, asc, eq, gte, inArray, not, or, sql } from 'drizzle-orm';
import type { DatabaseClient } from '../db/drizzleClient';
import * as schema from '../db/schema';
import { aggregateSeriesProgress, orderWantedCandidates } from '../services/WantedSubtitlePriority';
import { classifyViewingPriority } from '../services/ViewingPriorityService';
import type { ProgressSnapshot } from '../services/ViewingPriorityQuery';
import type {
  MediaFileVariant,
  VariantAudioTrack,
  VariantSubtitleTrack,
  VariantMissingSubtitle,
  WantedSubtitle,
  SubtitleHistory,
} from '../types/modelTypes';
import type { WantedSubtitleState, VariantMediaType, SubtitleTrackSource } from '../db/schema';

export interface UpsertVariantInput {
  mediaType: VariantMediaType;
  movieId?: number | undefined;
  episodeId?: number | undefined;
  path: string;
  fileSize: number;
  monitored?: boolean | undefined;
  probeFingerprint?: string | undefined;
  releaseName?: string | undefined;
  quality?: string | undefined;
}

export interface UpsertAudioTrackInput {
  streamIndex: number;
  languageCode?: string | undefined;
  codec?: string | undefined;
  channels?: string | undefined;
  isDefault?: boolean | undefined;
  isForced?: boolean | undefined;
  isCommentary?: boolean | undefined;
  name?: string | undefined;
}

export interface UpsertSubtitleTrackInput {
  source: SubtitleTrackSource;
  streamIndex?: number | undefined;
  languageCode?: string | undefined;
  isForced?: boolean | undefined;
  isHi?: boolean | undefined;
  codec?: string | undefined;
  filePath?: string | undefined;
  fileSize?: number | undefined;
}

export interface UpsertWantedSubtitleInput {
  variantId: number;
  languageCode: string;
  isForced?: boolean | undefined;
  isHi?: boolean | undefined;
}

export interface CreateSubtitleHistoryInput {
  variantId: number;
  wantedSubtitleId?: number | undefined;
  languageCode: string;
  provider?: string | undefined;
  score?: number | undefined;
  storedPath?: string;
  message?: string;
}

export interface UpsertMissingSubtitleInput {
  languageCode: string;
  isForced?: boolean;
  isHi?: boolean;
}

export interface CreateSubtitleTrackInput {
  variantId: number;
  source: SubtitleTrackSource;
  streamIndex?: number;
  languageCode?: string;
  isForced?: boolean;
  isHi?: boolean;
  codec?: string;
  filePath?: string;
  fileSize?: number;
}

/**
 * Repository for variant-scoped subtitle/audio inventory and wanted state.
 */
export class SubtitleVariantRepository {
  constructor(private readonly prisma: DatabaseClient) {}

  async upsertVariant(input: UpsertVariantInput): Promise<MediaFileVariant> {
    if (input.mediaType !== 'MOVIE' && input.mediaType !== 'EPISODE') {
      throw new Error(`Unsupported variant media type '${String(input.mediaType)}'`);
    }
    if (input.mediaType === 'MOVIE' && !input.movieId) {
      throw new Error('movieId is required for MOVIE variants');
    }

    if (input.mediaType === 'EPISODE' && !input.episodeId) {
      throw new Error('episodeId is required for EPISODE variants');
    }

    const updateSet = {
      movieId: input.movieId ?? null,
      episodeId: input.episodeId ?? null,
      fileSize: Number(input.fileSize),
      monitored: input.monitored ?? true,
      probeFingerprint: input.probeFingerprint ?? null,
      releaseName: input.releaseName ?? null,
      quality: input.quality ?? null,
    } as const;

    const [row] = await this.prisma.drizzle
      .insert(schema.mediaFileVariants)
      .values({
        mediaType: input.mediaType,
        movieId: input.movieId ?? null,
        episodeId: input.episodeId ?? null,
        path: input.path,
        fileSize: Number(input.fileSize),
        monitored: input.monitored ?? true,
        probeFingerprint: input.probeFingerprint ?? null,
        releaseName: input.releaseName ?? null,
        quality: input.quality ?? null,
      })
      .onConflictDoUpdate({
        target: [schema.mediaFileVariants.mediaType, schema.mediaFileVariants.path],
        set: updateSet,
      })
      .returning();
    if (!row) {
      throw new Error('SubtitleVariantRepository.upsertVariant: returned no row');
    }
    return row as MediaFileVariant;
  }

  async replaceAudioTracks(
    variantId: number,
    tracks: UpsertAudioTrackInput[],
  ): Promise<VariantAudioTrack[]> {
    await this.prisma.drizzle
      .delete(schema.variantAudioTracks)
      .where(eq(schema.variantAudioTracks.variantId, variantId));

    if (tracks.length === 0) {
      return [];
    }

    await this.prisma.drizzle.insert(schema.variantAudioTracks).values(
      tracks.map((track) => ({
        variantId,
        streamIndex: track.streamIndex,
        languageCode: track.languageCode?.toLowerCase() ?? null,
        codec: track.codec ?? null,
        channels: track.channels ?? null,
        isDefault: track.isDefault ?? false,
        isForced: track.isForced ?? false,
        isCommentary: track.isCommentary ?? false,
        name: track.name ?? null,
      })),
    );

    return this.prisma.drizzle
      .select()
      .from(schema.variantAudioTracks)
      .where(eq(schema.variantAudioTracks.variantId, variantId))
      .orderBy(asc(schema.variantAudioTracks.streamIndex)) as unknown as Promise<VariantAudioTrack[]>;
  }

  async replaceSubtitleTracks(
    variantId: number,
    tracks: UpsertSubtitleTrackInput[],
  ): Promise<VariantSubtitleTrack[]> {
    await this.prisma.drizzle
      .delete(schema.variantSubtitleTracks)
      .where(eq(schema.variantSubtitleTracks.variantId, variantId));

    if (tracks.length === 0) {
      return [];
    }

    await this.prisma.drizzle.insert(schema.variantSubtitleTracks).values(
      tracks.map((track) => ({
        variantId,
        source: track.source,
        streamIndex: track.streamIndex ?? null,
        languageCode: track.languageCode?.toLowerCase() ?? null,
        isForced: track.isForced ?? false,
        isHi: track.isHi ?? false,
        codec: track.codec ?? null,
        filePath: track.filePath ?? null,
        fileSize: track.fileSize != null ? Number(track.fileSize) : null,
      })),
    );

    return this.prisma.drizzle
      .select()
      .from(schema.variantSubtitleTracks)
      .where(eq(schema.variantSubtitleTracks.variantId, variantId))
      .orderBy(
        asc(schema.variantSubtitleTracks.source),
        asc(schema.variantSubtitleTracks.streamIndex),
      ) as unknown as Promise<VariantSubtitleTrack[]>;
  }

  async upsertWantedSubtitle(
    input: UpsertWantedSubtitleInput,
  ): Promise<WantedSubtitle> {
    const isForced = input.isForced ?? false;
    const isHi = input.isHi ?? false;
    const languageCode = input.languageCode.toLowerCase();

    const [row] = await this.prisma.drizzle
      .insert(schema.wantedSubtitles)
      .values({ variantId: input.variantId, languageCode, isForced, isHi })
      .onConflictDoUpdate({
        target: [
          schema.wantedSubtitles.variantId,
          schema.wantedSubtitles.languageCode,
          schema.wantedSubtitles.isForced,
          schema.wantedSubtitles.isHi,
        ],
        set: { languageCode },
      })
      .returning();
    if (!row) {
      throw new Error('SubtitleVariantRepository.upsertWantedSubtitle: returned no row');
    }
    return row as WantedSubtitle;
  }

  async updateWantedSubtitleState(
    id: number,
    state: WantedSubtitleState,
  ): Promise<WantedSubtitle> {
    const rows = await this.prisma.drizzle
      .update(schema.wantedSubtitles)
      .set({ state })
      .where(eq(schema.wantedSubtitles.id, id))
      .returning();
    const updated = rows[0];
    if (!updated) {
      throw new Error(`SubtitleVariantRepository.updateWantedSubtitleState: wanted subtitle ${id} not found`);
    }
    return updated as WantedSubtitle;
  }

  async createSubtitleHistory(
    input: CreateSubtitleHistoryInput,
  ): Promise<SubtitleHistory> {
    const [row] = await this.prisma.drizzle
      .insert(schema.subtitleHistories)
      .values({
        variantId: input.variantId,
        wantedSubtitleId: input.wantedSubtitleId ?? null,
        languageCode: input.languageCode.toLowerCase(),
        provider: input.provider ?? null,
        score: input.score ?? null,
        storedPath: input.storedPath ?? null,
        message: input.message ?? null,
      })
      .returning();
    if (!row) {
      throw new Error('SubtitleVariantRepository.createSubtitleHistory: returned no row');
    }
    return row as SubtitleHistory;
  }

  async createSubtitleTrack(
    input: CreateSubtitleTrackInput,
  ): Promise<VariantSubtitleTrack> {
    const [row] = await this.prisma.drizzle
      .insert(schema.variantSubtitleTracks)
      .values({
        variantId: input.variantId,
        source: input.source,
        streamIndex: input.streamIndex ?? null,
        languageCode: input.languageCode?.toLowerCase() ?? null,
        isForced: input.isForced ?? false,
        isHi: input.isHi ?? false,
        codec: input.codec ?? null,
        filePath: input.filePath ?? null,
        fileSize: input.fileSize != null ? Number(input.fileSize) : null,
      })
      .returning();
    if (!row) {
      throw new Error('SubtitleVariantRepository.createSubtitleTrack: returned no row');
    }
    return row as VariantSubtitleTrack;
  }

  async deleteSubtitleHistory(id: number): Promise<void> {
    await this.prisma.drizzle
      .delete(schema.subtitleHistories)
      .where(eq(schema.subtitleHistories.id, id));
  }

  async listMovieVariants(movieId: number): Promise<MediaFileVariant[]> {
    return this.prisma.drizzle
      .select()
      .from(schema.mediaFileVariants)
      .where(
        and(
          eq(schema.mediaFileVariants.mediaType, 'MOVIE'),
          eq(schema.mediaFileVariants.movieId, movieId),
        ),
      )
      .orderBy(asc(schema.mediaFileVariants.path)) as unknown as Promise<MediaFileVariant[]>;
  }

  async listEpisodeVariants(episodeId: number): Promise<MediaFileVariant[]> {
    return this.prisma.drizzle
      .select()
      .from(schema.mediaFileVariants)
      .where(
        and(
          eq(schema.mediaFileVariants.mediaType, 'EPISODE'),
          eq(schema.mediaFileVariants.episodeId, episodeId),
        ),
      )
      .orderBy(asc(schema.mediaFileVariants.path)) as unknown as Promise<MediaFileVariant[]>;
  }

  async listMonitoredVariants(): Promise<MediaFileVariant[]> {
    return this.prisma.drizzle
      .select()
      .from(schema.mediaFileVariants)
      .where(eq(schema.mediaFileVariants.monitored, true))
      .orderBy(asc(schema.mediaFileVariants.id)) as unknown as Promise<MediaFileVariant[]>;
  }

  /**
   * Returns variants that were created after the given cutoff date.
   */
  async listRecentlyAddedVariants(cutoff: Date): Promise<Array<{ id: number }>> {
    return this.prisma.drizzle
      .select({ id: schema.mediaFileVariants.id })
      .from(schema.mediaFileVariants)
      .where(gte(schema.mediaFileVariants.createdAt, cutoff))
      .orderBy(asc(schema.mediaFileVariants.id)) as unknown as Promise<Array<{ id: number }>>;
  }

  /**
   * Returns variant IDs that have at least one WantedSubtitle in FAILED state.
   */
  async listVariantsWithFailedWanted(): Promise<Array<{ id: number }>> {
    const rows = await this.prisma.drizzle
      .selectDistinct({ variantId: schema.wantedSubtitles.variantId })
      .from(schema.wantedSubtitles)
      .where(eq(schema.wantedSubtitles.state, 'FAILED'));
    return rows.map((r: { variantId: number }) => ({ id: r.variantId }));
  }

  async getVariantInventory(variantId: number): Promise<{
    variant: MediaFileVariant | null;
    audioTracks: VariantAudioTrack[];
    subtitleTracks: VariantSubtitleTrack[];
    missingSubtitles: VariantMissingSubtitle[];
  }> {
    const variantRows = await this.prisma.drizzle
      .select()
      .from(schema.mediaFileVariants)
      .where(eq(schema.mediaFileVariants.id, variantId))
      .limit(1);
    const variant = (variantRows[0] as MediaFileVariant | undefined) ?? null;

    if (!variant) {
      return {
        variant: null,
        audioTracks: [],
        subtitleTracks: [],
        missingSubtitles: [],
      };
    }

    const [audioTracks, subtitleTracks, missingSubtitles] = await Promise.all([
      this.prisma.drizzle
        .select()
        .from(schema.variantAudioTracks)
        .where(eq(schema.variantAudioTracks.variantId, variantId))
        .orderBy(asc(schema.variantAudioTracks.streamIndex)),
      this.prisma.drizzle
        .select()
        .from(schema.variantSubtitleTracks)
        .where(eq(schema.variantSubtitleTracks.variantId, variantId))
        .orderBy(
          asc(schema.variantSubtitleTracks.source),
          asc(schema.variantSubtitleTracks.streamIndex),
        ),
      this.prisma.drizzle
        .select()
        .from(schema.variantMissingSubtitles)
        .where(eq(schema.variantMissingSubtitles.variantId, variantId))
        .orderBy(
          asc(schema.variantMissingSubtitles.languageCode),
          asc(schema.variantMissingSubtitles.isForced),
          asc(schema.variantMissingSubtitles.isHi),
        ),
    ]);

    return {
      variant,
      audioTracks: audioTracks as unknown as VariantAudioTrack[],
      subtitleTracks: subtitleTracks as unknown as VariantSubtitleTrack[],
      missingSubtitles: missingSubtitles as unknown as VariantMissingSubtitle[],
    };
  }

  async getWantedSubtitleById(id: number): Promise<WantedSubtitle | null> {
    const rows = await this.prisma.drizzle
      .select()
      .from(schema.wantedSubtitles)
      .where(eq(schema.wantedSubtitles.id, id))
      .limit(1);
    return (rows[0] as WantedSubtitle | undefined) ?? null;
  }

  async listWantedSubtitlesByVariant(variantId: number): Promise<WantedSubtitle[]> {
    return this.prisma.drizzle
      .select()
      .from(schema.wantedSubtitles)
      .where(eq(schema.wantedSubtitles.variantId, variantId))
      .orderBy(
        asc(schema.wantedSubtitles.languageCode),
        asc(schema.wantedSubtitles.isForced),
        asc(schema.wantedSubtitles.isHi),
      ) as unknown as Promise<WantedSubtitle[]>;
  }

  async listWantedSubtitlesByStates(
    states: WantedSubtitleState[],
    limit = 200,
  ): Promise<WantedSubtitle[]> {
    if (states.length === 0) {
      return [];
    }

    return this.prisma.drizzle
      .select()
      .from(schema.wantedSubtitles)
      .where(inArray(schema.wantedSubtitles.state, states))
      .orderBy(asc(schema.wantedSubtitles.updatedAt), asc(schema.wantedSubtitles.id))
      .limit(limit) as unknown as Promise<WantedSubtitle[]>;
  }

  /**
   * Fetchable wanted rows in viewing-priority order (track
   * feature_subtitle_coverage_priority_20261108, Phase 3).
   *
   * The plain query returns `updatedAt`/`id` order, so a show being watched competes with ~1,700 rows
   * nobody played. This loads a larger pool, resolves each row's movie/episode, attaches own or
   * series-inherited activity, and returns the highest-priority `limit` rows. Six small queries, run
   * once per cycle — not per row.
   */
  async listWantedSubtitlesByPriority(
    states: WantedSubtitleState[],
    limit = 200,
  ): Promise<WantedSubtitle[]> {
    if (states.length === 0) return [];
    const pool = await this.listWantedSubtitlesByStates(states, Math.max(limit * 5, limit));
    if (pool.length === 0) return [];

    const variantIds = [...new Set(pool.map((row) => row.variantId))];
    const variants = await this.prisma.drizzle
      .select({
        id: schema.mediaFileVariants.id,
        movieId: schema.mediaFileVariants.movieId,
        episodeId: schema.mediaFileVariants.episodeId,
      })
      .from(schema.mediaFileVariants)
      .where(inArray(schema.mediaFileVariants.id, variantIds)) as Array<{
        id: number;
        movieId: number | null;
        episodeId: number | null;
      }>;

    const episodeIds = [...new Set(variants.map((v) => v.episodeId).filter((id): id is number => id != null))];
    const movieIds = [...new Set(variants.map((v) => v.movieId).filter((id): id is number => id != null))];

    const episodeSeries = new Map<number, number | null>();
    const seriesIds = new Set<number>();
    if (episodeIds.length > 0) {
      const episodes = await this.prisma.drizzle
        .select({ id: schema.episodes.id, seasonId: schema.episodes.seasonId })
        .from(schema.episodes)
        .where(inArray(schema.episodes.id, episodeIds)) as Array<{ id: number; seasonId: number | null }>;
      const seasonIds = [...new Set(episodes.map((episode) => episode.seasonId).filter((id): id is number => id != null))];
      const seasonSeries = new Map<number, number>();
      if (seasonIds.length > 0) {
        const seasons = await this.prisma.drizzle
          .select({ id: schema.seasons.id, seriesId: schema.seasons.seriesId })
          .from(schema.seasons)
          .where(inArray(schema.seasons.id, seasonIds)) as Array<{ id: number; seriesId: number }>;
        for (const season of seasons) seasonSeries.set(season.id, season.seriesId);
      }
      for (const episode of episodes) {
        const seriesId = episode.seasonId != null ? seasonSeries.get(episode.seasonId) ?? null : null;
        episodeSeries.set(episode.id, seriesId);
        if (seriesId != null) seriesIds.add(seriesId);
      }
    }

    const latest = (rows: Array<{ mediaId: number; progress: number; isWatched: unknown; lastWatched: unknown }>): Map<number, ProgressSnapshot> => {
      const result = new Map<number, ProgressSnapshot>();
      for (const row of rows) {
        const snapshot: ProgressSnapshot = {
          mediaId: row.mediaId,
          progress: Number(row.progress ?? 0),
          isWatched: row.isWatched === true || row.isWatched === 1,
          lastWatched: row.lastWatched == null
            ? null
            : row.lastWatched instanceof Date
              ? row.lastWatched
              : new Date(Number(row.lastWatched) * 1000),
        };
        const current = result.get(row.mediaId);
        if (!current || (snapshot.lastWatched?.getTime() ?? 0) > (current.lastWatched?.getTime() ?? 0)) {
          result.set(row.mediaId, snapshot);
        }
      }
      return result;
    };

    const progressRows = async (mediaType: 'MOVIE' | 'EPISODE', ids: number[]) => {
      if (ids.length === 0) return [] as Array<{ mediaId: number; progress: number; isWatched: unknown; lastWatched: unknown }>;
      return this.prisma.drizzle
        .select({
          mediaId: schema.playbackProgress.mediaId,
          progress: schema.playbackProgress.progress,
          isWatched: schema.playbackProgress.isWatched,
          lastWatched: schema.playbackProgress.lastWatched,
        })
        .from(schema.playbackProgress)
        .where(and(
          eq(schema.playbackProgress.mediaType, mediaType),
          inArray(schema.playbackProgress.mediaId, ids),
        )) as unknown as Array<{ mediaId: number; progress: number; isWatched: unknown; lastWatched: unknown }>;
    };

    const [movieProgressRows, ownEpisodeProgressRows] = await Promise.all([
      progressRows('MOVIE', movieIds),
      progressRows('EPISODE', episodeIds),
    ]);

    // Series activity = sibling-episode progress, not just the wanted episode's own row.
    let siblingEpisodeIds: number[] = [];
    if (seriesIds.size > 0) {
      const siblings = await this.prisma.drizzle
        .select({ id: schema.episodes.id })
        .from(schema.episodes)
        .where(inArray(schema.episodes.seriesId, [...seriesIds])) as Array<{ id: number }>;
      siblingEpisodeIds = siblings.map((row) => row.id).filter((id) => !episodeSeries.has(id));
    }
    const siblingProgressRows = await progressRows('EPISODE', siblingEpisodeIds);

    const episodeToSeries = new Map<number, number>();
    for (const [episodeId, seriesId] of episodeSeries) {
      if (seriesId != null) episodeToSeries.set(episodeId, seriesId);
    }
    const allEpisodeProgress = latest([...ownEpisodeProgressRows, ...siblingProgressRows]);
    const seriesProgress = aggregateSeriesProgress(allEpisodeProgress, episodeToSeries);

    const mediaByVariant = new Map<number, { kind: 'movie' | 'episode'; id: number; addedAt: Date | null; seriesId: number | null }>();
    for (const variant of variants) {
      if (variant.movieId != null) {
        mediaByVariant.set(variant.id, { kind: 'movie', id: variant.movieId, addedAt: null, seriesId: null });
      } else if (variant.episodeId != null) {
        mediaByVariant.set(variant.id, {
          kind: 'episode',
          id: variant.episodeId,
          addedAt: null,
          seriesId: episodeSeries.get(variant.episodeId) ?? null,
        });
      }
    }

    const bucketsByWantedId = new Map<number, string>();
    for (const candidate of pool) {
      const media = mediaByVariant.get(candidate.variantId);
      if (!media) continue;
      const own = media.kind === 'movie'
        ? latest(movieProgressRows).get(media.id)
        : allEpisodeProgress.get(media.id);
      const inherited = media.kind === 'episode' && media.seriesId != null
        ? seriesProgress.get(media.seriesId)
        : undefined;
      bucketsByWantedId.set(candidate.id, classifyViewingPriority({
        kind: media.kind,
        id: media.id,
        addedAt: null,
        lastWatchedAt: own?.lastWatched ?? inherited?.lastWatched ?? null,
        isWatched: own?.isWatched ?? inherited?.isWatched ?? false,
        progress: own?.progress ?? inherited?.progress ?? null,
      }).bucket);
    }

    const ordered = orderWantedCandidates(
      pool.map((row) => ({ id: row.id, variantId: row.variantId })),
      (candidate) => mediaByVariant.get(candidate.variantId) ?? null,
      { movies: latest(movieProgressRows), episodes: allEpisodeProgress, series: seriesProgress },
    );
    const byId = new Map(pool.map((row) => [row.id, row]));
    return ordered
      .flatMap((candidate) => {
        const row = byId.get(candidate.id);
        if (!row) return [];
        return [{ ...row, priorityBucket: bucketsByWantedId.get(row.id) ?? 'backfill' } as WantedSubtitle];
      })
      .slice(0, limit);
  }

  async deleteMovieVariantsNotInPaths(
    movieId: number,
    paths: string[],
  ): Promise<void> {
    const filterPaths = paths.length > 0 ? paths : ['__EMPTY__'];
    await this.prisma.drizzle
      .delete(schema.mediaFileVariants)
      .where(
        and(
          eq(schema.mediaFileVariants.mediaType, 'MOVIE'),
          eq(schema.mediaFileVariants.movieId, movieId),
          not(inArray(schema.mediaFileVariants.path, filterPaths)),
        ),
      );
  }

  async deleteEpisodeVariantsNotInPaths(
    episodeId: number,
    paths: string[],
  ): Promise<void> {
    const filterPaths = paths.length > 0 ? paths : ['__EMPTY__'];
    await this.prisma.drizzle
      .delete(schema.mediaFileVariants)
      .where(
        and(
          eq(schema.mediaFileVariants.mediaType, 'EPISODE'),
          eq(schema.mediaFileVariants.episodeId, episodeId),
          not(inArray(schema.mediaFileVariants.path, filterPaths)),
        ),
      );
  }

  async replaceMissingSubtitles(
    variantId: number,
    subtitles: UpsertMissingSubtitleInput[],
  ): Promise<VariantMissingSubtitle[]> {
    await this.prisma.drizzle
      .delete(schema.variantMissingSubtitles)
      .where(eq(schema.variantMissingSubtitles.variantId, variantId));

    if (subtitles.length === 0) {
      return [];
    }

    await this.prisma.drizzle.insert(schema.variantMissingSubtitles).values(
      subtitles.map((subtitle) => ({
        variantId,
        languageCode: subtitle.languageCode.toLowerCase(),
        isForced: subtitle.isForced ?? false,
        isHi: subtitle.isHi ?? false,
      })),
    );

    return this.prisma.drizzle
      .select()
      .from(schema.variantMissingSubtitles)
      .where(eq(schema.variantMissingSubtitles.variantId, variantId))
      .orderBy(
        asc(schema.variantMissingSubtitles.languageCode),
        asc(schema.variantMissingSubtitles.isForced),
        asc(schema.variantMissingSubtitles.isHi),
      ) as unknown as Promise<VariantMissingSubtitle[]>;
  }

  async listMissingSubtitles(variantId: number): Promise<VariantMissingSubtitle[]> {
    return this.prisma.drizzle
      .select()
      .from(schema.variantMissingSubtitles)
      .where(eq(schema.variantMissingSubtitles.variantId, variantId))
      .orderBy(
        asc(schema.variantMissingSubtitles.languageCode),
        asc(schema.variantMissingSubtitles.isForced),
        asc(schema.variantMissingSubtitles.isHi),
      ) as unknown as Promise<VariantMissingSubtitle[]>;
  }

  async deleteWantedSubtitlesNotInTargets(
    variantId: number,
    targets: Array<{
      languageCode: string;
      isForced: boolean;
      isHi: boolean;
    }>,
  ): Promise<void> {
    if (targets.length === 0) {
      await this.prisma.drizzle
        .delete(schema.wantedSubtitles)
        .where(eq(schema.wantedSubtitles.variantId, variantId));
      return;
    }

    const existing = await this.prisma.drizzle
      .select({
        id: schema.wantedSubtitles.id,
        languageCode: schema.wantedSubtitles.languageCode,
        isForced: schema.wantedSubtitles.isForced,
        isHi: schema.wantedSubtitles.isHi,
      })
      .from(schema.wantedSubtitles)
      .where(eq(schema.wantedSubtitles.variantId, variantId));

    const allowed = new Set(
      targets.map(
        (target) =>
          `${target.languageCode.toLowerCase()}|${target.isForced}|${target.isHi}`,
      ),
    );
    const staleIds = existing
      .filter(
        (item: { languageCode: string; isForced: boolean; isHi: boolean }) =>
          !allowed.has(`${item.languageCode}|${item.isForced}|${item.isHi}`),
      )
      .map((item: { id: number }) => item.id);

    if (staleIds.length === 0) {
      return;
    }

    await this.prisma.drizzle
      .delete(schema.wantedSubtitles)
      .where(inArray(schema.wantedSubtitles.id, staleIds));
  }

  async deleteSubtitleTrack(id: number): Promise<void> {
    const rows = await this.prisma.drizzle
      .select({ filePath: schema.variantSubtitleTracks.filePath })
      .from(schema.variantSubtitleTracks)
      .where(eq(schema.variantSubtitleTracks.id, id))
      .limit(1);
    const track = rows[0];

    if (!track) {
      throw new Error('Subtitle track not found');
    }

    if (track.filePath) {
      try {
        await fs.access(track.filePath);
        await fs.unlink(track.filePath);
      } catch {
        // File may not exist on disk; continue with DB deletion
      }
    }

    await this.prisma.drizzle
      .delete(schema.variantSubtitleTracks)
      .where(eq(schema.variantSubtitleTracks.id, id));
  }

  async listSiblingSubtitlePaths(variantId: number): Promise<string[]> {
    const variantRows = await this.prisma.drizzle
      .select({
        id: schema.mediaFileVariants.id,
        movieId: schema.mediaFileVariants.movieId,
        episodeId: schema.mediaFileVariants.episodeId,
      })
      .from(schema.mediaFileVariants)
      .where(eq(schema.mediaFileVariants.id, variantId))
      .limit(1);
    const variant = variantRows[0];

    if (!variant) {
      return [];
    }

    const ownerFilters = [
      variant.movieId != null ? eq(schema.mediaFileVariants.movieId, variant.movieId) : undefined,
      variant.episodeId != null ? eq(schema.mediaFileVariants.episodeId, variant.episodeId) : undefined,
    ].filter((f): f is NonNullable<typeof f> => f !== undefined);

    if (ownerFilters.length === 0) {
      return [];
    }

    const siblingVariants = await this.prisma.drizzle
      .select({ id: schema.mediaFileVariants.id })
      .from(schema.mediaFileVariants)
      .where(
        and(
          not(eq(schema.mediaFileVariants.id, variant.id)),
          ownerFilters.length === 1 ? ownerFilters[0]! : or(...ownerFilters),
        ),
      );

    if (siblingVariants.length === 0) {
      return [];
    }

    const subtitleTracks = await this.prisma.drizzle
      .select({ filePath: schema.variantSubtitleTracks.filePath })
      .from(schema.variantSubtitleTracks)
      .where(
        and(
          inArray(
            schema.variantSubtitleTracks.variantId,
            siblingVariants.map((item: { id: number }) => item.id),
          ),
          sql`${schema.variantSubtitleTracks.filePath} IS NOT NULL`,
        ),
      );

    return subtitleTracks
      .map((track: { filePath: string | null }) => track.filePath)
      .filter((path: string | null): path is string => Boolean(path));
  }
}
