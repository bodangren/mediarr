import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
// Series schema for type inference
const seriesSchema = z.object({
    id: z.number(),
    title: z.string(),
    year: z.number(),
    monitored: z.boolean(),
    qualityProfileId: z.number(),
    added: z.string(),
    tvdbId: z.number().optional(),
    tmdbId: z.number().optional(),
    imdbId: z.string().optional(),
    path: z.string().optional(),
    status: z.string().optional(),
    overview: z.string().optional(),
    network: z.string().optional(),
}).passthrough();
// Series organize preview schema
const seriesOrganizePreviewSchema = z.object({
    seriesId: z.number(),
    seriesTitle: z.string(),
    seasonNumber: z.number(),
    episodeId: z.number(),
    episodeNumber: z.number(),
    episodeTitle: z.string().optional(),
    currentPath: z.string(),
    newPath: z.string(),
    isNewPath: z.boolean(),
});
// Episode import file schema
const episodeImportFileSchema = z.object({
    path: z.string(),
    size: z.number(),
    parsedSeriesTitle: z.string().optional(),
    parsedSeasonNumber: z.number().optional(),
    parsedEpisodeNumber: z.number().optional(),
    parsedEndingEpisodeNumber: z.number().optional(),
    parsedQuality: z.string().optional(),
    match: z.object({
        seriesId: z.number(),
        seasonId: z.number().optional(),
        episodeId: z.number().optional(),
        confidence: z.number(),
    }).optional(),
});
// Series search result schema for manual match
const seriesSearchResultSchema = z.object({
    id: z.number(),
    title: z.string(),
    year: z.number().optional(),
    overview: z.string().optional(),
    posterUrl: z.string().optional(),
    tvdbId: z.number().optional(),
    tmdbId: z.number().optional(),
    seasons: z.array(z.object({
        seasonNumber: z.number(),
        episodeCount: z.number().optional(),
    })).optional(),
});
export function createSeriesApi(client) {
    return {
        // Bulk edit endpoints
        bulkUpdate(seriesIds, changes) {
            return client.request({
                path: '/api/series/bulk',
                method: 'PUT',
                body: { seriesIds, changes },
            }, z.object({
                updated: z.number(),
                failed: z.number(),
                errors: z.array(z.object({
                    seriesId: z.number(),
                    error: z.string(),
                })).optional(),
            }));
        },
        getRootFolders() {
            return client.request({
                path: '/api/series/root-folders',
            }, z.object({
                rootFolders: z.array(z.string()),
            }));
        },
        // Organize/Rename endpoints
        previewOrganize(input) {
            return client.request({
                path: '/api/series/organize/preview',
                method: 'POST',
                body: input,
            }, z.object({
                previews: z.array(seriesOrganizePreviewSchema),
            }));
        },
        applyOrganize(input) {
            return client.request({
                path: '/api/series/organize/apply',
                method: 'PUT',
                body: input,
            }, z.object({
                renamed: z.number(),
                failed: z.number(),
                errors: z.array(z.object({
                    episodeId: z.number(),
                    error: z.string(),
                })),
            }));
        },
        // Import endpoints
        scanImport(input) {
            return client.request({
                path: '/api/series/import/scan',
                method: 'POST',
                body: input,
            }, z.object({
                files: z.array(episodeImportFileSchema),
            }));
        },
        applyImport(input) {
            return client.request({
                path: '/api/series/import/apply',
                method: 'POST',
                body: input,
            }, z.object({
                imported: z.number(),
                failed: z.number(),
                errors: z.array(z.object({
                    path: z.string(),
                    error: z.string(),
                })),
            }));
        },
        // Get series with seasons and episodes for manual match
        getSeriesWithEpisodes(seriesId) {
            return client.request({
                path: `/api/series/${seriesId}`,
            }, z.object({
                id: z.number(),
                title: z.string(),
                seasons: z.array(z.object({
                    id: z.number(),
                    seasonNumber: z.number(),
                    episodes: z.array(z.object({
                        id: z.number(),
                        episodeNumber: z.number(),
                        title: z.string(),
                    })),
                })),
            }).passthrough());
        },
    };
}
//# sourceMappingURL=seriesApi.js.map