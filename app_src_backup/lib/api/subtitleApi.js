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
const bulkUpdateMoviesSchema = z.object({
    success: z.boolean(),
    message: z.string(),
    updatedCount: z.number(),
    failedCount: z.number(),
});
const subtitleUploadRecordSchema = z.object({
    id: z.number(),
    mediaId: z.number(),
    mediaType: z.enum(['movie', 'episode']),
    filePath: z.string(),
    language: z.string(),
    forced: z.boolean(),
    hearingImpaired: z.boolean(),
});
export function createSubtitleApi(client) {
    return {
        listMovieVariants(movieId) {
            return client.request({
                path: routeMap.subtitleMovieVariants(movieId),
            }, z.array(subtitleVariantSchema));
        },
        listEpisodeVariants(episodeId) {
            return client.request({
                path: routeMap.subtitleEpisodeVariants(episodeId),
            }, z.array(subtitleVariantSchema));
        },
        manualSearch(input) {
            return client.request({
                path: routeMap.subtitleSearch,
                method: 'POST',
                body: input,
            }, z.array(manualSearchCandidateSchema));
        },
        manualDownload(input) {
            return client.request({
                path: routeMap.subtitleDownload,
                method: 'POST',
                body: input,
            }, manualDownloadSchema);
        },
        // Series support methods
        listSeriesVariants(seriesId) {
            return client.request({
                path: routeMap.subtitleSeriesVariants(seriesId),
            }, z.array(seriesSubtitleVariantSchema));
        },
        getEpisodeSubtitles(episodeId) {
            return client.request({
                path: routeMap.subtitleEpisodeSubtitles(episodeId),
            }, episodeSubtitleSchema);
        },
        syncSeries(seriesId) {
            return client.request({
                path: routeMap.subtitleSeriesSync(seriesId),
                method: 'POST',
            }, seriesSyncResultSchema);
        },
        scanSeriesDisk(seriesId) {
            return client.request({
                path: routeMap.subtitleSeriesScan(seriesId),
                method: 'POST',
            }, diskScanResultSchema);
        },
        searchSeriesSubtitles(seriesId) {
            return client.request({
                path: routeMap.subtitleSeriesSearch(seriesId),
                method: 'POST',
            }, subtitleSearchResultSchema);
        },
        // Movie support methods
        syncMovie(movieId) {
            return client.request({
                path: routeMap.subtitleMovieSync(movieId),
                method: 'POST',
            }, seriesSyncResultSchema);
        },
        scanMovieDisk(movieId) {
            return client.request({
                path: routeMap.subtitleMovieScan(movieId),
                method: 'POST',
            }, diskScanResultSchema);
        },
        searchMovieSubtitles(movieId) {
            return client.request({
                path: routeMap.subtitleMovieSearch(movieId),
                method: 'POST',
            }, subtitleSearchResultSchema);
        },
        bulkUpdateMovies(input) {
            return client.request({
                path: routeMap.subtitleMoviesBulk,
                method: 'PUT',
                body: input,
            }, bulkUpdateMoviesSchema);
        },
        uploadSubtitle(input) {
            const formData = new FormData();
            formData.append('file', input.file);
            formData.append('language', input.language);
            formData.append('forced', String(input.forced));
            formData.append('hearingImpaired', String(input.hearingImpaired));
            formData.append('mediaId', String(input.mediaId));
            formData.append('mediaType', input.mediaType);
            return client.request({
                path: routeMap.subtitleUpload,
                method: 'POST',
                body: formData,
                onUploadProgress: input.onUploadProgress,
            }, subtitleUploadRecordSchema);
        },
    };
}
//# sourceMappingURL=subtitleApi.js.map