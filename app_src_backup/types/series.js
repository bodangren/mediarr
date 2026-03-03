import { z } from 'zod';
/**
 * Calculate episode progress percentage.
 */
export function calculateEpisodeProgress(item) {
    const episodes = item.seasons?.flatMap(season => season.episodes ?? []) ?? [];
    if (episodes.length === 0) {
        return 0;
    }
    const completedEpisodes = episodes.filter(episode => Boolean(episode.path)).length;
    return (completedEpisodes / episodes.length) * 100;
}
/**
 * Get episode counts for a series.
 */
export function getEpisodeCounts(item) {
    const episodes = item.seasons?.flatMap(season => season.episodes ?? []) ?? [];
    const total = episodes.length;
    const completed = episodes.filter(episode => Boolean(episode.path)).length;
    return { total, completed };
}
/**
 * Determine file status for a series.
 */
export function getFileStatus(item) {
    const { total, completed } = getEpisodeCounts(item);
    if (total === 0) {
        return 'missing';
    }
    if (completed === 0) {
        return 'wanted';
    }
    return 'completed';
}
/**
 * Get next airing episode information.
 */
export function getNextAiring(item) {
    const episodes = item.seasons?.flatMap(season => season.episodes ?? []) ?? [];
    const now = new Date();
    // Find next episode that hasn't aired yet
    for (const episode of episodes) {
        if (episode.airDate) {
            const airDate = new Date(episode.airDate);
            if (airDate > now && episode.seasonNumber !== undefined && episode.episodeNumber !== undefined) {
                return {
                    episodeNumber: episode.episodeNumber,
                    seasonNumber: episode.seasonNumber,
                    airDate: episode.airDate,
                };
            }
        }
    }
    return null;
}
/**
 * Get last aired episode information.
 */
export function getLastAired(item) {
    const episodes = item.seasons?.flatMap(season => season.episodes ?? []) ?? [];
    const now = new Date();
    // Find most recent episode that has aired
    let lastEpisode = null;
    for (const episode of episodes) {
        if (episode.airDate && episode.seasonNumber !== undefined && episode.episodeNumber !== undefined) {
            const airDate = new Date(episode.airDate);
            if (airDate <= now) {
                if (!lastEpisode || new Date(episode.airDate) > new Date(lastEpisode.airDate)) {
                    lastEpisode = {
                        episodeNumber: episode.episodeNumber,
                        seasonNumber: episode.seasonNumber,
                        airDate: episode.airDate,
                    };
                }
            }
        }
    }
    return lastEpisode;
}
//# sourceMappingURL=series.js.map