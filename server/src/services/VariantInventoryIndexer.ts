import {
  SubtitleVariantRepository,
  type UpsertSubtitleTrackInput,
} from '../repositories/SubtitleVariantRepository';
import { ProbeMetadataParser } from './ProbeMetadataParser';

export interface VariantFileInput {
  path: string;
  fileSize: bigint;
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
    fileSize?: bigint;
  }>;
}

/**
 * Synchronizes variant file inventory and parsed track metadata.
 */
export class VariantInventoryIndexer {
  constructor(
    private readonly repository: SubtitleVariantRepository,
    private readonly parser: ProbeMetadataParser = new ProbeMetadataParser(),
  ) {}

  async syncMovieVariants(
    movieId: number,
    files: VariantFileInput[],
  ): Promise<void> {
    const paths = files.map(file => file.path);
    await this.repository.deleteMovieVariantsNotInPaths(movieId, paths);

    for (const file of files) {
      const variant = await this.repository.upsertVariant({
        mediaType: 'MOVIE',
        movieId,
        path: file.path,
        fileSize: file.fileSize,
        monitored: file.monitored,
        probeFingerprint: file.probeFingerprint,
        releaseName: file.releaseName,
        quality: file.quality,
      });

      await this.updateTracks(variant.id, file);
    }
  }

  async syncEpisodeVariants(
    episodeId: number,
    files: VariantFileInput[],
  ): Promise<void> {
    const paths = files.map(file => file.path);
    await this.repository.deleteEpisodeVariantsNotInPaths(episodeId, paths);

    for (const file of files) {
      const variant = await this.repository.upsertVariant({
        mediaType: 'EPISODE',
        episodeId,
        path: file.path,
        fileSize: file.fileSize,
        monitored: file.monitored,
        probeFingerprint: file.probeFingerprint,
        releaseName: file.releaseName,
        quality: file.quality,
      });

      await this.updateTracks(variant.id, file);
    }
  }

  private async updateTracks(variantId: number, file: VariantFileInput): Promise<void> {
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

    await this.repository.replaceAudioTracks(variantId, parsed.audioTracks);
    await this.repository.replaceSubtitleTracks(variantId, [
      ...parsed.embeddedSubtitleTracks,
      ...external,
    ]);
  }
}
