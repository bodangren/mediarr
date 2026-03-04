import type {
  PrismaClient,
  MediaFileVariant,
  VariantAudioTrack,
  VariantSubtitleTrack,
  VariantMissingSubtitle,
  WantedSubtitle,
  WantedSubtitleState,
  SubtitleHistory,
  VariantMediaType,
  SubtitleTrackSource,
} from '@prisma/client';

export interface UpsertVariantInput {
  mediaType: VariantMediaType;
  movieId?: number;
  episodeId?: number;
  path: string;
  fileSize: bigint;
  monitored?: boolean;
  probeFingerprint?: string;
  releaseName?: string;
  quality?: string;
}

export interface UpsertAudioTrackInput {
  streamIndex: number;
  languageCode?: string;
  codec?: string;
  channels?: string;
  isDefault?: boolean;
  isForced?: boolean;
  isCommentary?: boolean;
  name?: string;
}

export interface UpsertSubtitleTrackInput {
  source: SubtitleTrackSource;
  streamIndex?: number;
  languageCode?: string;
  isForced?: boolean;
  isHi?: boolean;
  codec?: string;
  filePath?: string;
  fileSize?: bigint;
}

export interface UpsertWantedSubtitleInput {
  variantId: number;
  languageCode: string;
  isForced?: boolean;
  isHi?: boolean;
}

export interface CreateSubtitleHistoryInput {
  variantId: number;
  wantedSubtitleId?: number;
  languageCode: string;
  provider?: string;
  score?: number;
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
  fileSize?: bigint;
}

/**
 * Repository for variant-scoped subtitle/audio inventory and wanted state.
 */
export class SubtitleVariantRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async upsertVariant(input: UpsertVariantInput): Promise<MediaFileVariant> {
    if (input.mediaType === 'MOVIE' && !input.movieId) {
      throw new Error('movieId is required for MOVIE variants');
    }

    if (input.mediaType === 'EPISODE' && !input.episodeId) {
      throw new Error('episodeId is required for EPISODE variants');
    }

    return this.prisma.mediaFileVariant.upsert({
      where: {
        mediaType_path: {
          mediaType: input.mediaType,
          path: input.path,
        },
      },
      update: {
        movieId: input.movieId,
        episodeId: input.episodeId,
        fileSize: input.fileSize,
        monitored: input.monitored ?? true,
        probeFingerprint: input.probeFingerprint,
        releaseName: input.releaseName,
        quality: input.quality,
      },
      create: {
        mediaType: input.mediaType,
        movieId: input.movieId,
        episodeId: input.episodeId,
        path: input.path,
        fileSize: input.fileSize,
        monitored: input.monitored ?? true,
        probeFingerprint: input.probeFingerprint,
        releaseName: input.releaseName,
        quality: input.quality,
      },
    });
  }

  async replaceAudioTracks(
    variantId: number,
    tracks: UpsertAudioTrackInput[],
  ): Promise<VariantAudioTrack[]> {
    await this.prisma.variantAudioTrack.deleteMany({
      where: { variantId },
    });

    if (tracks.length === 0) {
      return [];
    }

    await this.prisma.variantAudioTrack.createMany({
      data: tracks.map(track => ({
        variantId,
        streamIndex: track.streamIndex,
        languageCode: track.languageCode?.toLowerCase(),
        codec: track.codec,
        channels: track.channels,
        isDefault: track.isDefault ?? false,
        isForced: track.isForced ?? false,
        isCommentary: track.isCommentary ?? false,
        name: track.name,
      })),
    });

    return this.prisma.variantAudioTrack.findMany({
      where: { variantId },
      orderBy: { streamIndex: 'asc' },
    });
  }

  async replaceSubtitleTracks(
    variantId: number,
    tracks: UpsertSubtitleTrackInput[],
  ): Promise<VariantSubtitleTrack[]> {
    await this.prisma.variantSubtitleTrack.deleteMany({
      where: { variantId },
    });

    if (tracks.length === 0) {
      return [];
    }

    await this.prisma.variantSubtitleTrack.createMany({
      data: tracks.map(track => ({
        variantId,
        source: track.source,
        streamIndex: track.streamIndex,
        languageCode: track.languageCode?.toLowerCase(),
        isForced: track.isForced ?? false,
        isHi: track.isHi ?? false,
        codec: track.codec,
        filePath: track.filePath,
        fileSize: track.fileSize,
      })),
    });

    return this.prisma.variantSubtitleTrack.findMany({
      where: { variantId },
      orderBy: [{ source: 'asc' }, { streamIndex: 'asc' }],
    });
  }

  async upsertWantedSubtitle(
    input: UpsertWantedSubtitleInput,
  ): Promise<WantedSubtitle> {
    return this.prisma.wantedSubtitle.upsert({
      where: {
        variantId_languageCode_isForced_isHi: {
          variantId: input.variantId,
          languageCode: input.languageCode.toLowerCase(),
          isForced: input.isForced ?? false,
          isHi: input.isHi ?? false,
        },
      },
      update: {},
      create: {
        variantId: input.variantId,
        languageCode: input.languageCode.toLowerCase(),
        isForced: input.isForced ?? false,
        isHi: input.isHi ?? false,
      },
    });
  }

  async updateWantedSubtitleState(
    id: number,
    state: WantedSubtitleState,
  ): Promise<WantedSubtitle> {
    return this.prisma.wantedSubtitle.update({
      where: { id },
      data: { state },
    });
  }

  async createSubtitleHistory(
    input: CreateSubtitleHistoryInput,
  ): Promise<SubtitleHistory> {
    return this.prisma.subtitleHistory.create({
      data: {
        variantId: input.variantId,
        wantedSubtitleId: input.wantedSubtitleId,
        languageCode: input.languageCode.toLowerCase(),
        provider: input.provider,
        score: input.score,
        storedPath: input.storedPath,
        message: input.message,
      },
    });
  }

  async createSubtitleTrack(
    input: CreateSubtitleTrackInput,
  ): Promise<VariantSubtitleTrack> {
    return this.prisma.variantSubtitleTrack.create({
      data: {
        variantId: input.variantId,
        source: input.source,
        streamIndex: input.streamIndex,
        languageCode: input.languageCode?.toLowerCase(),
        isForced: input.isForced ?? false,
        isHi: input.isHi ?? false,
        codec: input.codec,
        filePath: input.filePath,
        fileSize: input.fileSize,
      },
    });
  }

  async listMovieVariants(movieId: number): Promise<MediaFileVariant[]> {
    return this.prisma.mediaFileVariant.findMany({
      where: { mediaType: 'MOVIE', movieId },
      orderBy: { path: 'asc' },
    });
  }

  async listEpisodeVariants(episodeId: number): Promise<MediaFileVariant[]> {
    return this.prisma.mediaFileVariant.findMany({
      where: { mediaType: 'EPISODE', episodeId },
      orderBy: { path: 'asc' },
    });
  }

  async listMonitoredVariants(): Promise<MediaFileVariant[]> {
    return this.prisma.mediaFileVariant.findMany({
      where: { monitored: true },
      orderBy: { id: 'asc' },
    });
  }

  async getVariantInventory(variantId: number): Promise<{
    variant: MediaFileVariant | null;
    audioTracks: VariantAudioTrack[];
    subtitleTracks: VariantSubtitleTrack[];
    missingSubtitles: VariantMissingSubtitle[];
  }> {
    const variant = await this.prisma.mediaFileVariant.findUnique({
      where: { id: variantId },
    });

    if (!variant) {
      return {
        variant: null,
        audioTracks: [],
        subtitleTracks: [],
        missingSubtitles: [],
      };
    }

    const [audioTracks, subtitleTracks, missingSubtitles] = await Promise.all([
      this.prisma.variantAudioTrack.findMany({
        where: { variantId },
        orderBy: { streamIndex: 'asc' },
      }),
      this.prisma.variantSubtitleTrack.findMany({
        where: { variantId },
        orderBy: [{ source: 'asc' }, { streamIndex: 'asc' }],
      }),
      this.prisma.variantMissingSubtitle.findMany({
        where: { variantId },
        orderBy: [{ languageCode: 'asc' }, { isForced: 'asc' }, { isHi: 'asc' }],
      }),
    ]);

    return {
      variant,
      audioTracks,
      subtitleTracks,
      missingSubtitles,
    };
  }

  async getWantedSubtitleById(id: number): Promise<WantedSubtitle | null> {
    return this.prisma.wantedSubtitle.findUnique({
      where: { id },
    });
  }

  async listWantedSubtitlesByVariant(variantId: number): Promise<WantedSubtitle[]> {
    return this.prisma.wantedSubtitle.findMany({
      where: { variantId },
      orderBy: [{ languageCode: 'asc' }, { isForced: 'asc' }, { isHi: 'asc' }],
    });
  }

  async listWantedSubtitlesByStates(
    states: WantedSubtitleState[],
    limit = 200,
  ): Promise<WantedSubtitle[]> {
    if (states.length === 0) {
      return [];
    }

    return this.prisma.wantedSubtitle.findMany({
      where: {
        state: { in: states },
      },
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
      take: limit,
    });
  }

  async deleteMovieVariantsNotInPaths(
    movieId: number,
    paths: string[],
  ): Promise<void> {
    await this.prisma.mediaFileVariant.deleteMany({
      where: {
        mediaType: 'MOVIE',
        movieId,
        path: { notIn: paths.length > 0 ? paths : ['__EMPTY__'] },
      },
    });
  }

  async deleteEpisodeVariantsNotInPaths(
    episodeId: number,
    paths: string[],
  ): Promise<void> {
    await this.prisma.mediaFileVariant.deleteMany({
      where: {
        mediaType: 'EPISODE',
        episodeId,
        path: { notIn: paths.length > 0 ? paths : ['__EMPTY__'] },
      },
    });
  }

  async replaceMissingSubtitles(
    variantId: number,
    subtitles: UpsertMissingSubtitleInput[],
  ): Promise<VariantMissingSubtitle[]> {
    await this.prisma.variantMissingSubtitle.deleteMany({
      where: { variantId },
    });

    if (subtitles.length === 0) {
      return [];
    }

    await this.prisma.variantMissingSubtitle.createMany({
      data: subtitles.map(subtitle => ({
        variantId,
        languageCode: subtitle.languageCode.toLowerCase(),
        isForced: subtitle.isForced ?? false,
        isHi: subtitle.isHi ?? false,
      })),
    });

    return this.prisma.variantMissingSubtitle.findMany({
      where: { variantId },
      orderBy: [{ languageCode: 'asc' }, { isForced: 'asc' }, { isHi: 'asc' }],
    });
  }

  async listMissingSubtitles(variantId: number): Promise<VariantMissingSubtitle[]> {
    return this.prisma.variantMissingSubtitle.findMany({
      where: { variantId },
      orderBy: [{ languageCode: 'asc' }, { isForced: 'asc' }, { isHi: 'asc' }],
    });
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
      await this.prisma.wantedSubtitle.deleteMany({ where: { variantId } });
      return;
    }

    const existing = await this.prisma.wantedSubtitle.findMany({
      where: { variantId },
      select: {
        id: true,
        languageCode: true,
        isForced: true,
        isHi: true,
      },
    });

    const allowed = new Set(
      targets.map(
        target =>
          `${target.languageCode.toLowerCase()}|${target.isForced}|${target.isHi}`,
      ),
    );
    const staleIds = existing
      .filter(
        item =>
          !allowed.has(`${item.languageCode}|${item.isForced}|${item.isHi}`),
      )
      .map(item => item.id);

    if (staleIds.length === 0) {
      return;
    }

    await this.prisma.wantedSubtitle.deleteMany({
      where: { id: { in: staleIds } },
    });
  }

  async listSiblingSubtitlePaths(variantId: number): Promise<string[]> {
    const variant = await this.prisma.mediaFileVariant.findUnique({
      where: { id: variantId },
      select: {
        id: true,
        movieId: true,
        episodeId: true,
      },
    });

    if (!variant) {
      return [];
    }

    const ownerFilters = [
      variant.movieId ? { movieId: variant.movieId } : undefined,
      variant.episodeId ? { episodeId: variant.episodeId } : undefined,
    ].filter(Boolean) as Array<{ movieId?: number; episodeId?: number }>;

    if (ownerFilters.length === 0) {
      return [];
    }

    const siblingVariants = await this.prisma.mediaFileVariant.findMany({
      where: {
        id: { not: variant.id },
        OR: ownerFilters,
      },
      select: { id: true },
    });

    if (siblingVariants.length === 0) {
      return [];
    }

    const subtitleTracks = await this.prisma.variantSubtitleTrack.findMany({
      where: {
        variantId: { in: siblingVariants.map(item => item.id) },
        filePath: { not: null },
      },
      select: { filePath: true },
    });

    return subtitleTracks
      .map(track => track.filePath)
      .filter((path): path is string => Boolean(path));
  }
}
