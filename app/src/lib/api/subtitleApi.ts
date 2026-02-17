import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { routeMap } from './routeMap';

const subtitleVariantSchema = z.object({
  variantId: z.number(),
  path: z.string(),
}).passthrough();

const manualSearchCandidateSchema = z.object({
  languageCode: z.string(),
  isForced: z.boolean(),
  isHi: z.boolean(),
  provider: z.string(),
  score: z.number(),
  extension: z.string().optional(),
});

const manualDownloadSchema = z.object({
  storedPath: z.string(),
});

// Series support schemas
const subtitleTrackSchema = z.object({
  languageCode: z.string(),
  isForced: z.boolean(),
  isHi: z.boolean(),
  path: z.string(),
  provider: z.string(),
});

const episodeSubtitleSchema = z.object({
  episodeId: z.number(),
  seasonNumber: z.number(),
  episodeNumber: z.number(),
  subtitleTracks: z.array(subtitleTrackSchema),
  missingSubtitles: z.array(z.string()),
});

const seriesSubtitleVariantSchema = z.object({
  seriesId: z.number(),
  seasonNumber: z.number(),
  episodes: z.array(episodeSubtitleSchema),
});

const seriesSyncResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  episodesUpdated: z.number(),
});

const diskScanResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  subtitlesFound: z.number(),
  newSubtitles: z.number(),
});

const subtitleSearchResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  episodesSearched: z.number(),
  subtitlesDownloaded: z.number(),
});

export type SubtitleVariantInventory = z.infer<typeof subtitleVariantSchema>;
export type ManualSearchCandidate = z.infer<typeof manualSearchCandidateSchema>;
export type SubtitleTrack = z.infer<typeof subtitleTrackSchema>;
export type EpisodeSubtitle = z.infer<typeof episodeSubtitleSchema>;
export type SeriesSubtitleVariant = z.infer<typeof seriesSubtitleVariantSchema>;
export type SeriesSyncResult = z.infer<typeof seriesSyncResultSchema>;
export type DiskScanResult = z.infer<typeof diskScanResultSchema>;
export type SubtitleSearchResult = z.infer<typeof subtitleSearchResultSchema>;

export interface ManualSearchInput {
  movieId?: number;
  episodeId?: number;
  variantId?: number;
}

export interface ManualDownloadInput extends ManualSearchInput {
  candidate: ManualSearchCandidate;
}

export function createSubtitleApi(client: ApiHttpClient) {
  return {
    listMovieVariants(movieId: number): Promise<SubtitleVariantInventory[]> {
      return client.request(
        {
          path: routeMap.subtitleMovieVariants(movieId),
        },
        z.array(subtitleVariantSchema),
      );
    },

    listEpisodeVariants(episodeId: number): Promise<SubtitleVariantInventory[]> {
      return client.request(
        {
          path: routeMap.subtitleEpisodeVariants(episodeId),
        },
        z.array(subtitleVariantSchema),
      );
    },

    manualSearch(input: ManualSearchInput): Promise<ManualSearchCandidate[]> {
      return client.request(
        {
          path: routeMap.subtitleSearch,
          method: 'POST',
          body: input,
        },
        z.array(manualSearchCandidateSchema),
      );
    },

    manualDownload(input: ManualDownloadInput): Promise<z.infer<typeof manualDownloadSchema>> {
      return client.request(
        {
          path: routeMap.subtitleDownload,
          method: 'POST',
          body: input,
        },
        manualDownloadSchema,
      );
    },

    // Series support methods
    listSeriesVariants(seriesId: number): Promise<SeriesSubtitleVariant[]> {
      return client.request(
        {
          path: routeMap.subtitleSeriesVariants(seriesId),
        },
        z.array(seriesSubtitleVariantSchema),
      );
    },

    getEpisodeSubtitles(episodeId: number): Promise<EpisodeSubtitle> {
      return client.request(
        {
          path: routeMap.subtitleEpisodeSubtitles(episodeId),
        },
        episodeSubtitleSchema,
      );
    },

    syncSeries(seriesId: number): Promise<SeriesSyncResult> {
      return client.request(
        {
          path: routeMap.subtitleSeriesSync(seriesId),
          method: 'POST',
        },
        seriesSyncResultSchema,
      );
    },

    scanSeriesDisk(seriesId: number): Promise<DiskScanResult> {
      return client.request(
        {
          path: routeMap.subtitleSeriesScan(seriesId),
          method: 'POST',
        },
        diskScanResultSchema,
      );
    },

    searchSeriesSubtitles(seriesId: number): Promise<SubtitleSearchResult> {
      return client.request(
        {
          path: routeMap.subtitleSeriesSearch(seriesId),
          method: 'POST',
        },
        subtitleSearchResultSchema,
      );
    },

    // Movie support methods
    syncMovie(movieId: number): Promise<SeriesSyncResult> {
      return client.request(
        {
          path: routeMap.subtitleMovieSync(movieId),
          method: 'POST',
        },
        seriesSyncResultSchema,
      );
    },

    scanMovieDisk(movieId: number): Promise<DiskScanResult> {
      return client.request(
        {
          path: routeMap.subtitleMovieScan(movieId),
          method: 'POST',
        },
        diskScanResultSchema,
      );
    },

    searchMovieSubtitles(movieId: number): Promise<SubtitleSearchResult> {
      return client.request(
        {
          path: routeMap.subtitleMovieSearch(movieId),
          method: 'POST',
        },
        subtitleSearchResultSchema,
      );
    },
  };
}
