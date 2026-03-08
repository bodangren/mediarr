import fs from 'node:fs/promises';
import path from 'node:path';
import { SubtitleVariantRepository } from '../repositories/SubtitleVariantRepository';
import { SubtitleNamingService } from './SubtitleNamingService';
import { SubtitleProviderFactory } from './SubtitleProviderFactory';
import { SubtitleScoringService } from './SubtitleScoringService';
import { ALLOWED_SUBTITLE_EXTENSIONS } from './providers/providerUtils';

export interface ManualSearchCandidate {
  languageCode: string;
  isForced: boolean;
  isHi: boolean;
  provider: string;
  score: number;
  releaseName?: string;
  providerData?: Record<string, unknown>;
  content?: Buffer;
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

export type UploadMediaType = 'movie' | 'episode';

export interface SubtitleUploadInput {
  mediaId: number;
  mediaType: UploadMediaType;
  language: string;
  forced: boolean;
  hearingImpaired: boolean;
  originalFilename: string;
  content: Buffer;
}

export interface UploadedSubtitleRecord {
  id: number;
  mediaId: number;
  mediaType: UploadMediaType;
  filePath: string;
  language: string;
  forced: boolean;
  hearingImpaired: boolean;
}

const SUBTITLE_FLAG_TOKENS = new Set(['forced', 'forc', 'sdh', 'hi', 'cc']);
const LANGUAGE_TOKEN_MAP = new Map<string, string>([
  ['en', 'en'],
  ['eng', 'en'],
  ['english', 'en'],
  ['th', 'th'],
  ['tha', 'th'],
  ['thai', 'th'],
  ['zh', 'zh'],
  ['zho', 'zh'],
  ['chi', 'zh'],
  ['chs', 'zh'],
  ['cht', 'zh'],
  ['cn', 'zh'],
  ['sc', 'zh'],
  ['tc', 'zh'],
  ['jp', 'ja'],
  ['jpn', 'ja'],
  ['ja', 'ja'],
  ['japanese', 'ja'],
]);

export interface SubtitleDiskScanResult {
  subtitlesFound: number;
  newSubtitles: number;
}

/**
 * API-oriented service for variant inventory and manual subtitle workflows.
 */
export class SubtitleInventoryApiService {
  constructor(
    private readonly repository: SubtitleVariantRepository,
    private readonly namingService: SubtitleNamingService = new SubtitleNamingService(),
    private readonly providerFactory?: SubtitleProviderFactory,
    private readonly scoringService: SubtitleScoringService = new SubtitleScoringService(),
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
    const variantId = await this.resolveVariantId(input);
    const inventory = await this.repository.getVariantInventory(variantId);
    if (!inventory.variant) {
      throw new Error(`Variant ${variantId} not found`);
    }

    const context = {
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
    };

    const candidates = provider
      ? await provider.search(context)
      : await this.searchAcrossProviders(context);

    return this.scoringService.rankManual(candidates, inventory.variant.releaseName);
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
    const resolvedProvider = this.resolveProviderForCandidate(
      provider,
      input.candidate.provider,
    );
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

    const contentBuffer = this.toContentBuffer(candidate.content);
    await fs.mkdir(path.dirname(storedPath), { recursive: true });
    await fs.writeFile(storedPath, contentBuffer);

    await this.repository.createSubtitleTrack({
      variantId,
      source: 'EXTERNAL',
      languageCode: candidate.languageCode,
      isForced: candidate.isForced,
      isHi: candidate.isHi,
      filePath: storedPath,
      fileSize: BigInt(contentBuffer.byteLength),
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

  async uploadSubtitle(input: SubtitleUploadInput): Promise<UploadedSubtitleRecord> {
    const extension = path.extname(input.originalFilename).toLowerCase();
    if (!ALLOWED_SUBTITLE_EXTENSIONS.has(extension)) {
      throw new Error('Only subtitle files are supported (.srt, .ass, .ssa, .sub, .vtt)');
    }

    const variant = await this.resolveVariantForUpload(input.mediaId, input.mediaType);
    const inventory = await this.repository.getVariantInventory(variant.id);

    const siblingPaths = await this.repository.listSiblingSubtitlePaths(variant.id);
    const ownPaths = inventory.subtitleTracks
      .map(track => track.filePath)
      .filter((value): value is string => Boolean(value));

    const subtitlesDirectory = process.env.SUBTITLES_DIR;

    const namingInput = {
      videoPath: variant.path,
      languageCode: input.language,
      isForced: input.forced,
      isHi: input.hearingImpaired,
      extension,
      variantToken: variant.releaseName ?? `${input.mediaType}-${input.mediaId}`,
      existingPaths: [...siblingPaths, ...ownPaths],
      ...(subtitlesDirectory ? { subtitleDirectory: subtitlesDirectory } : {}),
    };

    let storedPath = this.namingService.buildSubtitlePath(namingInput);

    if (await this.fileExists(storedPath)) {
      storedPath = this.namingService.buildSubtitlePath({
        ...namingInput,
        existingPaths: [...siblingPaths, ...ownPaths, storedPath],
      });
    }

    await fs.mkdir(path.dirname(storedPath), { recursive: true });
    await fs.writeFile(storedPath, input.content);

    const track = await this.repository.createSubtitleTrack({
      variantId: variant.id,
      source: 'EXTERNAL',
      languageCode: input.language,
      isForced: input.forced,
      isHi: input.hearingImpaired,
      filePath: storedPath,
      fileSize: BigInt(input.content.byteLength),
    });

    return {
      id: track.id,
      mediaId: input.mediaId,
      mediaType: input.mediaType,
      filePath: storedPath,
      language: track.languageCode ?? input.language,
      forced: track.isForced,
      hearingImpaired: track.isHi,
    };
  }

  async scanMovieDisk(movieId: number): Promise<SubtitleDiskScanResult> {
    const variants = await this.repository.listMovieVariants(movieId);
    return this.scanVariants(variants);
  }

  async scanEpisodeDisk(episodeId: number): Promise<SubtitleDiskScanResult> {
    const variants = await this.repository.listEpisodeVariants(episodeId);
    return this.scanVariants(variants);
  }

  private resolveProviderForCandidate(
    provider?: ManualSubtitleProvider,
    providerName?: string,
  ): ManualSubtitleProvider {
    if (provider) {
      return provider;
    }

    if (!this.providerFactory) {
      throw new Error('Manual subtitle provider is required');
    }

    const requestedProvider = providerName?.toLowerCase();
    if (requestedProvider) {
      return this.providerFactory.resolveManualProvider(requestedProvider);
    }

    return this.providerFactory.resolveManualProvider();
  }

  private async searchAcrossProviders(context: {
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
  }): Promise<ManualSearchCandidate[]> {
    if (!this.providerFactory) {
      throw new Error('Manual subtitle provider is required');
    }

    const providers = this.providerFactory.resolveAllManualProviders();
    const searches = await Promise.all(
      providers.map(async entry => {
        try {
          const candidates = await entry.provider.search(context);
          return candidates.map(candidate => ({
            ...candidate,
            provider: candidate.provider || entry.name,
          }));
        } catch (error) {
          console.warn(
            `[SubtitleInventoryApiService] Provider '${entry.name}' search failed:`,
            error,
          );
          return [];
        }
      }),
    );

    return searches.flat();
  }

  private toContentBuffer(content: Buffer | undefined): Buffer {
    if (!content) {
      return Buffer.alloc(0);
    }

    return Buffer.isBuffer(content) ? content : Buffer.from(content);
  }

  private async mapVariantInventory(
    variantIds: number[],
  ): Promise<VariantInventoryView[]> {
    const inventories = await Promise.all(
      variantIds.map(variantId => this.repository.getVariantInventory(variantId)),
    );
    return inventories
      .filter(inventory => inventory.variant != null)
      .map(inventory => ({
        variantId: inventory.variant!.id,
        path: inventory.variant!.path,
        fileSize: inventory.variant!.fileSize,
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
      }));
  }

  private async scanVariants(
    variants: Array<{
      id: number;
      path: string;
    }>,
  ): Promise<SubtitleDiskScanResult> {
    let subtitlesFound = 0;
    let newSubtitles = 0;

    for (const variant of variants) {
      const inventory = await this.repository.getVariantInventory(variant.id);
      if (!inventory.variant) {
        continue;
      }

      const scannedExternalTracks = await this.scanExternalSubtitleTracks(inventory.variant.path);
      subtitlesFound += scannedExternalTracks.length;

      const existingExternalPaths = new Set(
        inventory.subtitleTracks
          .filter(track => track.source === 'EXTERNAL')
          .map(track => track.filePath)
          .filter((value): value is string => Boolean(value)),
      );
      newSubtitles += scannedExternalTracks.filter(track => {
        return Boolean(track.filePath && !existingExternalPaths.has(track.filePath));
      }).length;

      const preservedEmbeddedTracks = inventory.subtitleTracks
        .filter(track => track.source !== 'EXTERNAL')
        .map(track => ({
          source: track.source,
          streamIndex: track.streamIndex ?? undefined,
          languageCode: track.languageCode ?? undefined,
          isForced: track.isForced,
          isHi: track.isHi,
          codec: track.codec ?? undefined,
          filePath: track.filePath ?? undefined,
          fileSize: track.fileSize ?? undefined,
        }));

      await this.repository.replaceSubtitleTracks(variant.id, [
        ...preservedEmbeddedTracks,
        ...scannedExternalTracks,
      ]);
    }

    return { subtitlesFound, newSubtitles };
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
        const selected = variants[0];
        if (!selected) {
          throw new Error(`No variants found for movie ${input.movieId}`);
        }
        return selected.id;
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
        const selected = variants[0];
        if (!selected) {
          throw new Error(`No variants found for episode ${input.episodeId}`);
        }
        return selected.id;
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

  private async resolveVariantForUpload(
    mediaId: number,
    mediaType: UploadMediaType,
  ): Promise<{ id: number; path: string; releaseName: string | null }> {
    const variants = mediaType === 'movie'
      ? await this.repository.listMovieVariants(mediaId)
      : await this.repository.listEpisodeVariants(mediaId);

    if (variants.length === 0) {
      throw new Error(`No variants found for ${mediaType} ${mediaId}`);
    }

    const selected = variants[0];
    if (!selected) {
      throw new Error(`No variants found for ${mediaType} ${mediaId}`);
    }

    return {
      id: selected.id,
      path: selected.path,
      releaseName: selected.releaseName,
    };
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async scanExternalSubtitleTracks(videoPath: string): Promise<Array<{
    source: 'EXTERNAL';
    languageCode?: string;
    isForced: boolean;
    isHi: boolean;
    filePath: string;
    fileSize: bigint;
  }>> {
    const directory = path.dirname(videoPath);
    let entries: string[];
    try {
      entries = await fs.readdir(directory);
    } catch {
      return [];
    }

    const videoBaseName = path.basename(videoPath, path.extname(videoPath));
    const matches = entries.filter(entry => this.matchesVariantSubtitleFile(videoBaseName, entry));
    const tracks = await Promise.all(
      matches.map(async entry => {
        const fullPath = path.join(directory, entry);
        const stats = await fs.stat(fullPath);
        const metadata = this.parseSubtitleFilename(videoBaseName, entry);
        return {
          source: 'EXTERNAL' as const,
          languageCode: metadata.languageCode,
          isForced: metadata.isForced,
          isHi: metadata.isHi,
          filePath: fullPath,
          fileSize: BigInt(stats.size),
        };
      }),
    );

    return tracks;
  }

  private matchesVariantSubtitleFile(videoBaseName: string, entryName: string): boolean {
    const extension = path.extname(entryName).toLowerCase();
    if (!ALLOWED_SUBTITLE_EXTENSIONS.has(extension)) {
      return false;
    }

    const subtitleBaseName = path.basename(entryName, extension);
    const escapedBase = videoBaseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^${escapedBase}(?:[._\\- ].+)?$`, 'i').test(subtitleBaseName);
  }

  private parseSubtitleFilename(
    videoBaseName: string,
    entryName: string,
  ): {
    languageCode?: string;
    isForced: boolean;
    isHi: boolean;
  } {
    const extension = path.extname(entryName);
    const subtitleBaseName = path.basename(entryName, extension);
    const suffix = subtitleBaseName.slice(videoBaseName.length).replace(/^[._\-\s]+/, '');
    const tokens = suffix
      .split(/[._\-\s]+/)
      .map(token => token.trim().toLowerCase())
      .filter(Boolean);

    let languageCode: string | undefined;
    let isForced = false;
    let isHi = false;

    for (const token of tokens) {
      if (token === 'forced' || token === 'forc') {
        isForced = true;
        continue;
      }
      if (token === 'hi' || token === 'sdh' || token === 'cc') {
        isHi = true;
        continue;
      }
      if (!languageCode) {
        languageCode = LANGUAGE_TOKEN_MAP.get(token) ?? languageCode;
      }
      if (SUBTITLE_FLAG_TOKENS.has(token) && token !== 'forced' && token !== 'forc') {
        isHi = isHi || token === 'hi' || token === 'sdh' || token === 'cc';
      }
    }

    return {
      languageCode,
      isForced,
      isHi,
    };
  }
}
