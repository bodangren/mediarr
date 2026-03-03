import { z } from 'zod';
/**
 * Quality definition - represents a quality level (resolution + source)
 */
export const qualitySchema = z.object({
    id: z.number(),
    name: z.string(),
    resolution: z.string(), // e.g., '2160p', '1080p', '720p', '480p', 'SD'
    source: z.string(), // e.g., 'Bluray', 'Web-DL', 'HDTV', 'TV', 'DVD'
});
/**
 * Quality Profile - groups qualities together with a cutoff
 */
export const qualityProfileSchema = z.object({
    id: z.number(),
    name: z.string(),
    cutoffId: z.number(),
    qualities: z.array(qualitySchema),
    languageProfileId: z.number().optional(),
});
/**
 * Pre-defined quality definitions (should be configurable via API)
 */
export const PREDEFINED_RESOLUTIONS = ['2160p', '1080p', '720p', '480p', 'SD'];
export const PREDEFINED_SOURCES = ['Bluray', 'Web-DL', 'HDTV', 'TV', 'DVD', 'Unknown'];
/**
 * Get all possible quality combinations
 */
export function getAllQualities() {
    const qualities = [];
    for (const resolution of PREDEFINED_RESOLUTIONS) {
        for (const source of PREDEFINED_SOURCES) {
            qualities.push({ resolution, source });
        }
    }
    return qualities;
}
/**
 * Format quality for display
 */
export function formatQuality(quality) {
    return `${quality.source}-${quality.resolution}`;
}
/**
 * Check if a quality is HD
 */
export function isQualityHD(quality) {
    return ['2160p', '1080p', '720p'].includes(quality.resolution);
}
/**
 * Sort qualities by quality rank (higher quality first)
 */
export function sortQualitiesByRank(qualities) {
    const rankMap = {
        '2160p': 5,
        '1080p': 4,
        '720p': 3,
        '480p': 2,
        'SD': 1,
    };
    return [...qualities].sort((a, b) => {
        const rankA = rankMap[a.resolution] ?? 0;
        const rankB = rankMap[b.resolution] ?? 0;
        if (rankA !== rankB) {
            return rankB - rankA; // Higher resolution first
        }
        // Same resolution, sort by source (Bluray > Web-DL > HDTV > TV > DVD > Unknown)
        const sourceRank = {
            Bluray: 6,
            'Web-DL': 5,
            HDTV: 4,
            TV: 3,
            DVD: 2,
            Unknown: 1,
        };
        const sourceRankA = sourceRank[a.source] ?? 0;
        const sourceRankB = sourceRank[b.source] ?? 0;
        return sourceRankB - sourceRankA;
    });
}
//# sourceMappingURL=qualityProfile.js.map