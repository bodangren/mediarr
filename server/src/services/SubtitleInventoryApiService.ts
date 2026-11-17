import fs from 'node:fs/promises';
import path from 'node:path';
import { SubtitleVariantRepository } from '../repositories/SubtitleVariantRepository';
import { SubtitleNamingService } from './SubtitleNamingService';
import { SubtitleProviderFactory } from './SubtitleProviderFactory';
import { SubtitleScoringService } from './SubtitleScoringService';
import { ALLOWED_SUBTITLE_EXTENSIONS } from './providers/providerUtils';
import type { SubtitleUploadInput as SharedSubtitleUploadInput } from '../contracts/subtitle';
import { ActivityEventEmitter } from './ActivityEventEmitter';

export type UploadMediaType = 'movie' | 'episode';

export interface ManualSearchCandidate {
  languageCode: string;
  isForced: boolean;
  isHi: boolean;
  provider: string;
  score: number;
  releaseName?: string | undefined;
  providerData?: Record<string, unknown> | undefined;
  content?: Buffer | undefined;
  extension?: string | undefined;
}

/**
 * Server-specific subtitle upload input extending the shared contract.
 * Adds originalFilename and content fields required by the server.
 */
export interface SubtitleUploadInput extends SharedSubtitleUploadInput {
  originalFilename: string;
  content: Buffer;
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

  /**
   * Whether this provider has the credentials it needs.
   *
   * Unconfigured providers throw "API Key is missing" on every search; the
   * automation then marks every wanted row FAILED. Reporting configuration up
   * front lets the wanted queue idle instead of churning (2026-11-08: 1,900
   * failed downloads and 9,069 failed searches in 24 h with no key set).
   */
  isConfigured?(): Promise<boolean>;
}

export interface VariantInventoryView {
  variantId: number;
  path: string;
  fileSize: number;
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
    id: number;
    provider: string;
    languageCode: string | null;
    isForced: boolean;
    isHi: boolean;
    path: string;
  }>;
  missingSubtitles: Array<{
    languageCode: string;
    isForced: boolean;
    isHi: boolean;
  }>;
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

export interface SidecarMatch {
  from: string;
  to: string;
}

export interface SidecarMatchResult {
  matched: SidecarMatch[];
  unmatched: string[];
}

/** Language tokens that mark a sidecar as Chinese (`*.zho.srt`, `*.zh.srt`, ...). */
const CHINESE_SIDECAR_TOKENS = new Set(['zh', 'zho', 'chi']);

const EPISODE_TAG_PATTERN = /(?:^|[^a-z0-9])s(\d{1,2})[ ._-]?e(\d{1,3})(?=[^a-z0-9]|$)/i;

function episodeTagOf(value: string): { season: number; episode: number } | null {
  const match = EPISODE_TAG_PATTERN.exec(value);
  if (!match) return null;
  return { season: Number(match[1]), episode: Number(match[2]) };
}

/**
 * API-oriented service for variant inventory and manual subtitle workflows.
 */
/**
 * Picks the file a manual subtitle action should target when the caller did not
 * say which variant it means.
 *
 * A movie with two cuts (or two releases) used to make `POST /api/subtitles/search`
 * throw, which the client surfaced as "Search failed" with an HTTP 500 (seen on
 * the TV 2026-11-17 for A Biltmore Christmas). The largest file is the main
 * feature, which is what a viewer pressing "Search Subtitles" means.
 */
export function pickPrimaryVariant<T extends { id: number; fileSize?: number | string | null }>(
  variants: T[],
): T | null {
  if (variants.length === 0) return null;
  const sorted = [...variants].sort((a, b) => {
    const sizeDelta = Number(b.fileSize ?? 0) - Number(a.fileSize ?? 0);
    if (sizeDelta !== 0) return sizeDelta;
    return a.id - b.id;
  });
  return sorted[0] ?? null;
}

export class SubtitleInventoryApiService {
  constructor(
    private readonly repository: SubtitleVariantRepository,
    private readonly namingService: SubtitleNamingService = new SubtitleNamingService(),
    private readonly providerFactory?: SubtitleProviderFactory,
    private readonly scoringService: SubtitleScoringService = new SubtitleScoringService(),
    private readonly activityEventEmitter?: ActivityEventEmitter,
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

  async deleteSubtitleTrack(id: number): Promise<void> {
    return this.repository.deleteSubtitleTrack(id);
  }

  async manualSearch(
    input: {
      movieId?: number;
      episodeId?: number;
      variantId?: number;
    },
    provider?: ManualSubtitleProvider,
  ): Promise<ManualSearchCandidate[]> {
    const variantId = await this.resolveVariantId(input, { fallbackToPrimary: true });
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
    const variantId = await this.resolveVariantId(input, { fallbackToPrimary: true });
    const inventory = await this.repository.getVariantInventory(variantId);
    if (!inventory.variant) {
      throw new Error(`Variant ${variantId} not found`);
    }

    let candidate = input.candidate;
    let wantedId: number | undefined;
    let storedPath: string | undefined;
    let createdTrackId: number | undefined;
    let createdHistoryId: number | undefined;

    try {
      const wanted = await this.repository.upsertWantedSubtitle({
        variantId,
        languageCode: candidate.languageCode,
        isForced: candidate.isForced,
        isHi: candidate.isHi,
      });
      wantedId = wanted.id;
      await this.repository.updateWantedSubtitleState(wantedId, 'SEARCHING');

      const resolvedProvider = this.resolveProviderForCandidate(
        provider,
        candidate.provider,
      );
      candidate = resolvedProvider.download
        ? await resolvedProvider.download(candidate)
        : candidate;
      const contentBuffer = this.toContentBuffer(candidate.content);

      const siblingPaths = await this.repository.listSiblingSubtitlePaths(variantId);
      const ownPaths = inventory.subtitleTracks
        .map(track => track.filePath)
        .filter((value): value is string => Boolean(value));
      const variantToken =
        inventory.variant.releaseName ?? `variant-${inventory.variant.id}`;

      storedPath = this.namingService.buildSubtitlePath({
        videoPath: inventory.variant.path,
        languageCode: candidate.languageCode,
        isForced: candidate.isForced,
        isHi: candidate.isHi,
        extension: candidate.extension ?? '.srt',
        variantToken,
        existingPaths: [...siblingPaths, ...ownPaths],
      });

      await fs.mkdir(path.dirname(storedPath), { recursive: true });
      await fs.writeFile(storedPath, contentBuffer);

      const track = await this.repository.createSubtitleTrack({
        variantId,
        source: 'EXTERNAL',
        languageCode: candidate.languageCode,
        isForced: candidate.isForced,
        isHi: candidate.isHi,
        filePath: storedPath,
        fileSize: Number(contentBuffer.byteLength),
      });
      createdTrackId = track.id;
      const history = await this.repository.createSubtitleHistory({
        variantId,
        wantedSubtitleId: wantedId,
        languageCode: candidate.languageCode,
        provider: candidate.provider,
        score: candidate.score,
        storedPath,
        message: 'Manual subtitle download',
      });
      createdHistoryId = history.id;

      await this.repository.updateWantedSubtitleState(wantedId, 'DOWNLOADED');
      await this.activityEventEmitter?.emit({
        eventType: 'SUBTITLE_DOWNLOADED',
        sourceModule: 'subtitle-inventory-api',
        entityRef: `wanted:${wantedId}`,
        summary: `Manual subtitle downloaded (${candidate.languageCode})`,
        success: true,
        occurredAt: new Date(),
      });

      return { storedPath };
    } catch (error) {
      await this.cleanupPartialDownload(storedPath, createdTrackId, createdHistoryId);
      await this.recordManualDownloadFailure(
        variantId,
        wantedId,
        candidate,
        error,
      );
      throw error;
    }
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
      fileSize: Number(input.content.byteLength),
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

  /**
   * Find Chinese sidecars named for an older release in the same directory and copy them to
   * `<variant-stem>.<lang>.<ext>` when that exact target does not exist yet. Libraries hold
   * sidecars like `Special.Ops.Lioness - S01E01 ....zho.srt` next to
   * `Special Ops: Lioness - S01E01 ....mkv`; the disk scanner only matches the exact video stem, so
   * without this the coverage report says en-only even though the Chinese subtitle is on disk.
   *
   * `dryRun` is the default: the caller gets the planned copies without touching the disk.
   */
  async matchMovieSidecars(
    movieId: number,
    options: { dryRun?: boolean } = {},
  ): Promise<SidecarMatchResult> {
    const variants = await this.repository.listMovieVariants(movieId);
    return this.matchSidecarVariants(variants.map(variant => variant.path), options.dryRun !== false);
  }

  /** Series-wide variant of {@link matchMovieSidecars}: one pass over every episode variant folder. */
  async matchSeriesSidecars(
    episodeIds: number[],
    options: { dryRun?: boolean } = {},
  ): Promise<SidecarMatchResult> {
    const paths: string[] = [];
    for (const episodeId of episodeIds) {
      const variants = await this.repository.listEpisodeVariants(episodeId);
      for (const variant of variants) {
        if (variant.path) paths.push(variant.path);
      }
    }
    return this.matchSidecarVariants(paths, options.dryRun !== false);
  }

  private normalizeSidecarStem(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
  }

  private async matchSidecarVariants(
    variantPaths: string[],
    dryRun: boolean,
  ): Promise<SidecarMatchResult> {
    const byDirectory = new Map<string, string[]>();
    for (const variantPath of variantPaths) {
      if (!variantPath) continue;
      const directory = path.dirname(variantPath);
      const bucket = byDirectory.get(directory) ?? [];
      bucket.push(variantPath);
      byDirectory.set(directory, bucket);
    }

    const matched: SidecarMatch[] = [];
    const unmatched = new Set<string>();

    for (const [directory, paths] of byDirectory) {
      let entries: string[];
      try {
        entries = await fs.readdir(directory);
      } catch {
        continue;
      }

      const videoStems = new Map<string, string>();
      for (const variantPath of paths) {
        videoStems.set(path.basename(variantPath, path.extname(variantPath)), variantPath);
      }

      for (const entry of entries.sort()) {
        const extension = path.extname(entry).toLowerCase();
        if (!ALLOWED_SUBTITLE_EXTENSIONS.has(extension)) continue;

        const subtitleStem = path.basename(entry, path.extname(entry));
        const tokens = subtitleStem.split(/[._\-\s]+/).filter(Boolean);
        const languageToken = tokens[tokens.length - 1]?.toLowerCase();
        if (!languageToken || !CHINESE_SIDECAR_TOKENS.has(languageToken)) continue;

        const from = path.join(directory, entry);
        // Already a valid sidecar for one of the variants (exact stem prefix) - nothing to copy.
        const exactOwner = [...videoStems.keys()].find(stem =>
          this.matchesVariantSubtitleFile(stem, entry),
        );
        if (exactOwner) continue;

        // Movies have no SxxExx tag: compare punctuation-insensitive stems (dots/colons vs spaces).
        const sidecarTitleStem = tokens.slice(0, -1).join(' ');
        const normalizedSidecarStem = this.normalizeSidecarStem(sidecarTitleStem);
        const stemOwner = normalizedSidecarStem
          ? [...videoStems.entries()].find(
              ([stem]) => this.normalizeSidecarStem(stem) === normalizedSidecarStem,
            )
          : undefined;
        const sidecarTag = episodeTagOf(subtitleStem);
        const owner = stemOwner ?? (sidecarTag
          ? [...videoStems.entries()].find(([stem]) => {
              const variantTag = episodeTagOf(stem);
              return variantTag?.season === sidecarTag.season
                && variantTag.episode === sidecarTag.episode;
            })
          : undefined);
        if (!owner) {
          unmatched.add(from);
          continue;
        }

        const target = path.join(directory, `${owner[0]}.${languageToken}${extension}`);
        if (await this.fileExists(target)) {
          // The correctly named sidecar already exists; the orphan is redundant, not a failure.
          continue;
        }

        matched.push({ from, to: target });
        if (!dryRun) {
          await fs.copyFile(from, target);
        }
      }
    }

    return {
      matched,
      unmatched: [...unmatched].sort(),
    };
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
    if (!content || content.byteLength === 0) {
      throw new Error('Subtitle provider returned missing or empty content');
    }

    return Buffer.isBuffer(content) ? content : Buffer.from(content);
  }

  private async cleanupPartialDownload(
    storedPath?: string,
    trackId?: number,
    historyId?: number,
  ): Promise<void> {
    if (historyId != null) {
      await this.repository.deleteSubtitleHistory(historyId).catch(() => undefined);
    }
    if (trackId != null) {
      await this.repository.deleteSubtitleTrack(trackId).catch(() => undefined);
    }
    if (storedPath) {
      await fs.unlink(storedPath).catch(() => undefined);
    }
  }

  private async recordManualDownloadFailure(
    variantId: number,
    wantedId: number | undefined,
    candidate: ManualSearchCandidate,
    error: unknown,
  ): Promise<void> {
    const message = error instanceof Error ? error.message : String(error);
    let failureWantedId = wantedId;

    if (failureWantedId == null) {
      const wanted = await this.repository.upsertWantedSubtitle({
        variantId,
        languageCode: candidate.languageCode,
        isForced: candidate.isForced,
        isHi: candidate.isHi,
      }).catch(() => null);
      failureWantedId = wanted?.id;
    }
    if (failureWantedId != null) {
      await this.repository.updateWantedSubtitleState(failureWantedId, 'FAILED')
        .catch(() => undefined);
    }

    await this.repository.createSubtitleHistory({
      variantId,
      wantedSubtitleId: failureWantedId,
      languageCode: candidate.languageCode,
      provider: candidate.provider,
      score: candidate.score,
      message: `Manual subtitle download failed: ${message}`,
    }).catch(() => undefined);

    await this.activityEventEmitter?.emit({
      eventType: 'SUBTITLE_DOWNLOADED',
      sourceModule: 'subtitle-inventory-api',
      entityRef: failureWantedId != null ? `wanted:${failureWantedId}` : `variant:${variantId}`,
      summary: `Manual subtitle download failed (${candidate.languageCode}): ${message}`,
      success: false,
      occurredAt: new Date(),
    }).catch(() => undefined);
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
          id: track.id,
          provider: track.source.toLowerCase(),
          languageCode: track.languageCode,
          isForced: track.isForced,
          isHi: track.isHi,
          path: track.filePath ?? '',
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

  private async resolveVariantId(
    input: {
      movieId?: number;
      episodeId?: number;
      variantId?: number;
    },
    options: { fallbackToPrimary?: boolean } = {},
  ): Promise<number> {
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
        if (options.fallbackToPrimary) {
          const primary = pickPrimaryVariant(variants);
          if (primary) {
            console.warn(
              `[Subtitles] movie ${input.movieId} has ${variants.length} variants; using primary variant ${primary.id} for the manual action.`,
            );
            return primary.id;
          }
        }
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
        if (options.fallbackToPrimary) {
          const primary = pickPrimaryVariant(variants);
          if (primary) {
            console.warn(
              `[Subtitles] episode ${input.episodeId} has ${variants.length} variants; using primary variant ${primary.id} for the manual action.`,
            );
            return primary.id;
          }
        }
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
    languageCode?: string | undefined;
    isForced: boolean;
    isHi: boolean;
    filePath: string;
    fileSize: number;
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
          fileSize: Number(stats.size),
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
    languageCode?: string | undefined;
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
