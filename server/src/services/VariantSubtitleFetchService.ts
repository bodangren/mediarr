import fs from 'node:fs/promises';
import path from 'node:path';
import { SubtitleVariantRepository } from '../repositories/SubtitleVariantRepository';
import { SubtitleNamingService } from './SubtitleNamingService';
import { ActivityEventEmitter } from './ActivityEventEmitter';

export interface FetchProviderContext {
  wantedSubtitle: {
    id: number;
    languageCode: string;
    isForced: boolean;
    isHi: boolean;
  };
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
}

export interface SubtitleFetchCandidate {
  languageCode: string;
  isForced: boolean;
  isHi: boolean;
  provider: string;
  score: number;
  content?: Buffer | undefined;
  extension?: string | undefined;
}

export interface SubtitleFetchProvider {
  searchBestSubtitle(context: FetchProviderContext): Promise<SubtitleFetchCandidate | null>;
}

export interface FetchWantedResult {
  storedPath: string;
  provider: string;
  score: number;
}

/**
 * Fetches wanted subtitles, persists external subtitle track/history, and updates wanted state.
 */
export class VariantSubtitleFetchService {
  constructor(
    private readonly repository: SubtitleVariantRepository,
    private readonly namingService: SubtitleNamingService = new SubtitleNamingService(),
    private readonly activityEventEmitter?: ActivityEventEmitter,
  ) {}

  async fetchWantedSubtitle(
    wantedSubtitleId: number,
    provider: SubtitleFetchProvider,
  ): Promise<FetchWantedResult | null> {
    const wanted = await this.repository.getWantedSubtitleById(wantedSubtitleId);
    if (!wanted) {
      throw new Error(`Wanted subtitle ${wantedSubtitleId} not found`);
    }

    let inventory: Awaited<ReturnType<SubtitleVariantRepository['getVariantInventory']>> | undefined;
    let candidate: SubtitleFetchCandidate | undefined;
    let storedPath: string | undefined;
    let createdTrackId: number | undefined;
    let createdHistoryId: number | undefined;

    try {
      await this.repository.updateWantedSubtitleState(wanted.id, 'SEARCHING');
      inventory = await this.repository.getVariantInventory(wanted.variantId);
      if (!inventory.variant) {
        throw new Error(`Variant ${wanted.variantId} not found`);
      }

      const providerResult = await provider.searchBestSubtitle({
        wantedSubtitle: {
          id: wanted.id,
          languageCode: wanted.languageCode,
          isForced: wanted.isForced,
          isHi: wanted.isHi,
        },
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

      if (!providerResult) {
        await this.recordFailure(
          wanted,
          inventory,
          undefined,
          new Error(`No subtitle found for ${wanted.languageCode}`),
        );
        return null;
      }
      candidate = providerResult;

      if (!candidate.content || candidate.content.byteLength === 0) {
        throw new Error('Subtitle provider returned missing or empty content');
      }

      const siblingPaths = await this.repository.listSiblingSubtitlePaths(
        inventory.variant.id,
      );
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
      await fs.writeFile(storedPath, candidate.content);

      const track = await this.repository.createSubtitleTrack({
        variantId: inventory.variant.id,
        source: 'EXTERNAL',
        languageCode: candidate.languageCode,
        isForced: candidate.isForced,
        isHi: candidate.isHi,
        filePath: storedPath,
        fileSize: Number(candidate.content.byteLength),
      });
      createdTrackId = track.id;

      const history = await this.repository.createSubtitleHistory({
        variantId: inventory.variant.id,
        wantedSubtitleId: wanted.id,
        languageCode: candidate.languageCode,
        provider: candidate.provider,
        score: candidate.score,
        storedPath,
        message: 'Subtitle downloaded for variant',
      });
      createdHistoryId = history.id;

      await this.repository.updateWantedSubtitleState(wanted.id, 'DOWNLOADED');
      await this.activityEventEmitter?.emit({
        eventType: 'SUBTITLE_DOWNLOADED',
        sourceModule: 'subtitle-fetch-service',
        entityRef: `wanted:${wanted.id}`,
        summary: `Subtitle downloaded (${candidate.languageCode})`,
        success: true,
        occurredAt: new Date(),
      });

      return {
        storedPath,
        provider: candidate.provider,
        score: candidate.score,
      };
    } catch (error) {
      await this.cleanupPartialDownload(storedPath, createdTrackId, createdHistoryId);
      await this.recordFailure(wanted, inventory, candidate, error);
      throw error;
    }
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

  private async recordFailure(
    wanted: Awaited<ReturnType<SubtitleVariantRepository['getWantedSubtitleById']>> & {},
    inventory: Awaited<ReturnType<SubtitleVariantRepository['getVariantInventory']>> | undefined,
    candidate: SubtitleFetchCandidate | undefined,
    error: unknown,
  ): Promise<void> {
    const message = error instanceof Error ? error.message : String(error);
    await this.repository.updateWantedSubtitleState(wanted.id, 'FAILED').catch(() => undefined);

    if (inventory?.variant) {
      await this.repository.createSubtitleHistory({
        variantId: inventory.variant.id,
        wantedSubtitleId: wanted.id,
        languageCode: candidate?.languageCode ?? wanted.languageCode,
        provider: candidate?.provider,
        score: candidate?.score,
        message: `Subtitle download failed: ${message}`,
      }).catch(() => undefined);
    }

    await this.activityEventEmitter?.emit({
      eventType: 'SUBTITLE_DOWNLOADED',
      sourceModule: 'subtitle-fetch-service',
      entityRef: `wanted:${wanted.id}`,
      summary: `Subtitle download failed (${wanted.languageCode}): ${message}`,
      success: false,
      occurredAt: new Date(),
    }).catch(() => undefined);
  }
}
