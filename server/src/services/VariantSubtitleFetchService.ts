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
  extension?: string;
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

    await this.repository.updateWantedSubtitleState(wanted.id, 'SEARCHING');
    const inventory = await this.repository.getVariantInventory(wanted.variantId);
    if (!inventory.variant) {
      await this.repository.updateWantedSubtitleState(wanted.id, 'FAILED');
      throw new Error(`Variant ${wanted.variantId} not found`);
    }

    const candidate = await provider.searchBestSubtitle({
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

    if (!candidate) {
      await this.repository.updateWantedSubtitleState(wanted.id, 'FAILED');
      await this.activityEventEmitter?.emit({
        eventType: 'SUBTITLE_DOWNLOADED',
        sourceModule: 'subtitle-fetch-service',
        entityRef: `wanted:${wanted.id}`,
        summary: `No subtitle found for ${wanted.languageCode}`,
        success: false,
        occurredAt: new Date(),
      });
      return null;
    }

    const siblingPaths = await this.repository.listSiblingSubtitlePaths(
      inventory.variant.id,
    );
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
      variantId: inventory.variant.id,
      source: 'EXTERNAL',
      languageCode: candidate.languageCode,
      isForced: candidate.isForced,
      isHi: candidate.isHi,
      filePath: storedPath,
    });

    await this.repository.createSubtitleHistory({
      variantId: inventory.variant.id,
      wantedSubtitleId: wanted.id,
      languageCode: candidate.languageCode,
      provider: candidate.provider,
      score: candidate.score,
      storedPath,
      message: 'Subtitle downloaded for variant',
    });

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
  }
}
