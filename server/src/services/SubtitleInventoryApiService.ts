import { SubtitleVariantRepository } from '../repositories/SubtitleVariantRepository';
import { SubtitleNamingService } from './SubtitleNamingService';
import { SubtitleProviderFactory } from './SubtitleProviderFactory';

export interface ManualSearchCandidate {
  languageCode: string;
  isForced: boolean;
  isHi: boolean;
  provider: string;
  score: number;
  extension?: string;
}

export interface ManualSubtitleProvider {
  search(context: {
    variant: {
      id: number;
      path: string;
      releaseName?: string | null;
    };
    audioTracks: Array<{
      languageCode: string | null;
      isCommentary: boolean;
      isDefault: boolean;
    }>;
  }): Promise<ManualSearchCandidate[]>;

  download?(candidate: ManualSearchCandidate): Promise<ManualSearchCandidate>;
}

export interface VariantInventoryView {
  variantId: number;
  path: string;
  fileSize: bigint;
  audioTracks: Array<{
    streamIndex: number;
    languageCode: string | null;
    isCommentary: boolean;
    isDefault: boolean;
    isForced: boolean;
    codec: string | null;
    channels: string | null;
    name: string | null;
  }>;
  subtitleTracks: Array<{
    source: string;
    languageCode: string | null;
    isForced: boolean;
    isHi: boolean;
    filePath: string | null;
  }>;
  missingSubtitles: Array<{
    languageCode: string;
    isForced: boolean;
    isHi: boolean;
  }>;
}

/**
 * API-oriented service for variant inventory and manual subtitle workflows.
 */
export class SubtitleInventoryApiService {
  constructor(
    private readonly repository: SubtitleVariantRepository,
    private readonly namingService: SubtitleNamingService = new SubtitleNamingService(),
    private readonly providerFactory?: SubtitleProviderFactory,
  ) {}

  async listMovieVariantInventory(movieId: number): Promise<VariantInventoryView[]> {
    const variants = await this.repository.listMovieVariants(movieId);
    return this.mapVariantInventory(variants.map(variant => variant.id));
  }

  async listEpisodeVariantInventory(
    episodeId: number,
  ): Promise<VariantInventoryView[]> {
    const variants = await this.repository.listEpisodeVariants(episodeId);
    return this.mapVariantInventory(variants.map(variant => variant.id));
  }

  async manualSearch(
    input: {
      movieId?: number;
      episodeId?: number;
      variantId?: number;
    },
    provider?: ManualSubtitleProvider,
  ): Promise<ManualSearchCandidate[]> {
    const resolvedProvider = this.resolveProvider(provider);
    const variantId = await this.resolveVariantId(input);
    const inventory = await this.repository.getVariantInventory(variantId);
    if (!inventory.variant) {
      throw new Error(`Variant ${variantId} not found`);
    }

    return resolvedProvider.search({
      variant: {
        id: inventory.variant.id,
        path: inventory.variant.path,
        releaseName: inventory.variant.releaseName,
      },
      audioTracks: inventory.audioTracks.map(track => ({
        languageCode: track.languageCode,
        isCommentary: track.isCommentary,
        isDefault: track.isDefault,
      })),
    });
  }

  async manualDownload(
    input: {
      movieId?: number;
      episodeId?: number;
      variantId?: number;
      candidate: ManualSearchCandidate;
    },
    provider?: ManualSubtitleProvider,
  ): Promise<{ storedPath: string }> {
    const resolvedProvider = this.resolveProvider(provider);
    const variantId = await this.resolveVariantId(input);
    const inventory = await this.repository.getVariantInventory(variantId);
    if (!inventory.variant) {
      throw new Error(`Variant ${variantId} not found`);
    }

    const candidate = resolvedProvider.download
      ? await resolvedProvider.download(input.candidate)
      : input.candidate;

    const siblingPaths = await this.repository.listSiblingSubtitlePaths(variantId);
    const ownPaths = inventory.subtitleTracks
      .map(track => track.filePath)
      .filter((value): value is string => Boolean(value));
    const variantToken =
      inventory.variant.releaseName ?? `variant-${inventory.variant.id}`;

    const storedPath = this.namingService.buildSubtitlePath({
      videoPath: inventory.variant.path,
      languageCode: candidate.languageCode,
      isForced: candidate.isForced,
      isHi: candidate.isHi,
      extension: candidate.extension ?? '.srt',
      variantToken,
      existingPaths: [...siblingPaths, ...ownPaths],
    });

    await this.repository.createSubtitleTrack({
      variantId,
      source: 'EXTERNAL',
      languageCode: candidate.languageCode,
      isForced: candidate.isForced,
      isHi: candidate.isHi,
      filePath: storedPath,
    });
    await this.repository.createSubtitleHistory({
      variantId,
      languageCode: candidate.languageCode,
      provider: candidate.provider,
      score: candidate.score,
      storedPath,
      message: 'Manual subtitle download',
    });

    return { storedPath };
  }

  private resolveProvider(
    provider?: ManualSubtitleProvider,
  ): ManualSubtitleProvider {
    if (provider) {
      return provider;
    }

    if (!this.providerFactory) {
      throw new Error('Manual subtitle provider is required');
    }

    return this.providerFactory.resolveManualProvider();
  }

  private async mapVariantInventory(
    variantIds: number[],
  ): Promise<VariantInventoryView[]> {
    const items: VariantInventoryView[] = [];
    for (const variantId of variantIds) {
      const inventory = await this.repository.getVariantInventory(variantId);
      if (!inventory.variant) {
        continue;
      }
      items.push({
        variantId: inventory.variant.id,
        path: inventory.variant.path,
        fileSize: inventory.variant.fileSize,
        audioTracks: inventory.audioTracks.map(track => ({
          streamIndex: track.streamIndex,
          languageCode: track.languageCode,
          isCommentary: track.isCommentary,
          isDefault: track.isDefault,
          isForced: track.isForced,
          codec: track.codec,
          channels: track.channels,
          name: track.name,
        })),
        subtitleTracks: inventory.subtitleTracks.map(track => ({
          source: track.source,
          languageCode: track.languageCode,
          isForced: track.isForced,
          isHi: track.isHi,
          filePath: track.filePath,
        })),
        missingSubtitles: inventory.missingSubtitles.map(item => ({
          languageCode: item.languageCode,
          isForced: item.isForced,
          isHi: item.isHi,
        })),
      });
    }
    return items;
  }

  private async resolveVariantId(input: {
    movieId?: number;
    episodeId?: number;
    variantId?: number;
  }): Promise<number> {
    if (input.variantId) {
      return input.variantId;
    }

    if (input.movieId) {
      const variants = await this.repository.listMovieVariants(input.movieId);
      if (variants.length === 1) {
        return variants[0].id;
      }
      if (variants.length > 1) {
        throw new Error(
          'variantId is required when multiple variants exist for this movie',
        );
      }
      throw new Error(`No variants found for movie ${input.movieId}`);
    }

    if (input.episodeId) {
      const variants = await this.repository.listEpisodeVariants(input.episodeId);
      if (variants.length === 1) {
        return variants[0].id;
      }
      if (variants.length > 1) {
        throw new Error(
          'variantId is required when multiple variants exist for this episode',
        );
      }
      throw new Error(`No variants found for episode ${input.episodeId}`);
    }

    throw new Error('variantId, movieId, or episodeId is required');
  }
}
