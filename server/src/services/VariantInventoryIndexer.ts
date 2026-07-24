import {
  SubtitleVariantRepository,
  type UpsertSubtitleTrackInput,
} from '../repositories/SubtitleVariantRepository';
import { ProbeMetadataParser } from './ProbeMetadataParser';
import type { VariantMetadataProbe } from './FfprobeMetadataProbe';

export interface VariantFileInput {
  path: string;
  fileSize: number;
  monitored?: boolean;
  probeFingerprint?: string;
  releaseName?: string;
  quality?: string;
  probeMetadata?: unknown;
  externalSubtitles?: Array<{
    languageCode?: string;
    isForced?: boolean;
    isHi?: boolean;
    filePath?: string;
    fileSize?: number;
  }>;
}

/**
 * Synchronizes variant file inventory and parsed track metadata.
 */
export class VariantInventoryIndexer {
  constructor(
    private readonly repository: SubtitleVariantRepository,
    private readonly parser: ProbeMetadataParser = new ProbeMetadataParser(),
    private readonly metadataProbe?: VariantMetadataProbe,
  ) {}

  async indexMovieVariant(movieId: number, file: VariantFileInput): Promise<void> {
    await this.indexVariant('MOVIE', movieId, file);
  }

  async indexEpisodeVariant(episodeId: number, file: VariantFileInput): Promise<void> {
    await this.indexVariant('EPISODE', episodeId, file);
  }

  async syncMovieVariants(
    movieId: number,
    files: VariantFileInput[],
  ): Promise<void> {
    const paths = files.map(file => file.path);
    await this.repository.deleteMovieVariantsNotInPaths(movieId, paths);

    for (const file of files) {
      await this.indexVariant('MOVIE', movieId, file, true);
    }
  }

  async syncEpisodeVariants(
    episodeId: number,
    files: VariantFileInput[],
  ): Promise<void> {
    const paths = files.map(file => file.path);
    await this.repository.deleteEpisodeVariantsNotInPaths(episodeId, paths);

    for (const file of files) {
      await this.indexVariant('EPISODE', episodeId, file, true);
    }
  }

  private async indexVariant(
    mediaType: 'MOVIE' | 'EPISODE',
    ownerId: number,
    file: VariantFileInput,
    authoritative = false,
  ): Promise<void> {
    let probeMetadata = file.probeMetadata;
    if (probeMetadata === undefined && this.metadataProbe) {
      probeMetadata = await this.metadataProbe.probe(file.path);
    }

    const variant = await this.repository.upsertVariant({
      mediaType,
      ...(mediaType === 'MOVIE' ? { movieId: ownerId } : { episodeId: ownerId }),
      path: file.path,
      fileSize: file.fileSize,
      monitored: file.monitored,
      probeFingerprint: file.probeFingerprint,
      releaseName: file.releaseName,
      quality: file.quality,
    });

    if (!authoritative && probeMetadata === undefined && file.externalSubtitles === undefined) {
      return;
    }

    await this.updateTracks(variant.id, { ...file, probeMetadata }, authoritative);
  }

  private async updateTracks(
    variantId: number,
    file: VariantFileInput,
    authoritative: boolean,
  ): Promise<void> {
    const parsed = this.parser.parse(file.probeMetadata);
    const external: UpsertSubtitleTrackInput[] = (file.externalSubtitles ?? []).map(
      subtitle => ({
        source: 'EXTERNAL',
        streamIndex: undefined,
        languageCode: subtitle.languageCode,
        isForced: subtitle.isForced ?? false,
        isHi: subtitle.isHi ?? false,
        filePath: subtitle.filePath,
        fileSize: subtitle.fileSize,
      }),
    );

    if (authoritative || file.probeMetadata !== undefined) {
      await this.repository.replaceAudioTracks(variantId, parsed.audioTracks);
    }
    if (authoritative || file.probeMetadata !== undefined || file.externalSubtitles !== undefined) {
      await this.repository.replaceSubtitleTracks(variantId, [
        ...parsed.embeddedSubtitleTracks,
        ...external,
      ]);
    }
  }
}
