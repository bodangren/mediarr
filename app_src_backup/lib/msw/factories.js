function createRng(seed) {
    let state = seed;
    return () => {
        state = (state * 48271) % 0x7fffffff;
        return state / 0x7fffffff;
    };
}
function buildSeries(rng, index) {
    const id = index + 1;
    const title = ['Andor', 'Foundation', 'Silo', 'Severance', 'Slow Horses'][index % 5] ?? `Series ${id}`;
    const seasons = [1, 2].map(seasonNumber => ({
        seasonNumber,
        monitored: true,
        episodes: [1, 2, 3].map(episodeNumber => {
            const hasFile = rng() > 0.45;
            return {
                id: id * 100 + seasonNumber * 10 + episodeNumber,
                seasonNumber,
                episodeNumber,
                title: `Episode ${episodeNumber}`,
                monitored: true,
                path: hasFile ? `/media/series/${title}/S${seasonNumber}E${episodeNumber}.mkv` : null,
            };
        }),
    }));
    return {
        id,
        tvdbId: id + 1000,
        title,
        year: 2018 + (index % 7),
        status: rng() > 0.5 ? 'continuing' : 'ended',
        monitored: rng() > 0.2,
        seasons,
    };
}
function buildMovie(rng, index) {
    const id = index + 1;
    const title = ['The Matrix', 'Arrival', 'Dune', 'Interstellar', 'Blade Runner 2049'][index % 5] ?? `Movie ${id}`;
    const hasFile = rng() > 0.3;
    return {
        id,
        tmdbId: 600 + id,
        title,
        year: 1990 + index,
        status: hasFile ? 'released' : 'announced',
        monitored: rng() > 0.2,
        fileVariants: hasFile ? [{ id: id * 10, path: `/media/movies/${title}.mkv` }] : [],
    };
}
function buildMissingMovie(rng, index) {
    const id = index + 1;
    const movieId = 100 + id;
    const title = ['Dune: Part Two', 'Godzilla x Kong: The New Empire', 'Civil War', 'Furiosa: A Mad Max Saga', 'Inside Out 2'][index % 5] ?? `Missing Movie ${id}`;
    return {
        id,
        movieId,
        title,
        year: 2023 + (index % 2),
        posterUrl: `https://image.tmdb.org/t/p/w200/mock${id}.jpg`,
        status: ['missing', 'announced', 'incinemas', 'released'][index % 4],
        monitored: rng() > 0.15,
        cinemaDate: index % 3 === 0 ? '2024-03-01' : undefined,
        digitalRelease: index % 3 === 1 ? '2024-05-14' : undefined,
        physicalRelease: index % 3 === 2 ? '2024-06-18' : undefined,
        qualityProfileId: index % 2 === 0 ? 1 : 2,
        qualityProfileName: index % 2 === 0 ? 'HD-1080p' : 'UHD-2160p',
        runtime: 100 + (index % 10) * 10,
        certification: ['PG-13', 'R', 'PG'][index % 3],
        genres: ['Action', 'Adventure', 'Sci-Fi'].slice(0, 1 + (index % 3)),
    };
}
function buildIndexer(rng, index) {
    const id = index + 1;
    const failing = rng() > 0.7;
    return {
        id,
        name: `Indexer ${id}`,
        implementation: 'Torznab',
        configContract: 'TorznabSettings',
        settings: JSON.stringify({ url: `https://indexer${id}.example/api`, apiKey: `key-${id}` }),
        protocol: 'torrent',
        enabled: rng() > 0.15,
        supportsRss: true,
        supportsSearch: true,
        priority: 10 + index,
        health: failing
            ? {
                failureCount: 3,
                lastErrorMessage: 'timeout',
            }
            : {
                failureCount: 0,
                lastErrorMessage: null,
            },
    };
}
function buildTorrent(rng, index) {
    const progress = Math.round(rng() * 100);
    return {
        infoHash: `hash-${index + 1}`,
        name: `Release ${index + 1}`,
        status: progress >= 100 ? 'seeding' : 'downloading',
        progress,
        size: String(2_000_000_000),
        downloaded: String(Math.round(2_000_000_000 * (progress / 100))),
        uploaded: String(Math.round(700_000_000 * rng())),
        downloadSpeed: Math.round(1_500_000 * rng()),
        uploadSpeed: Math.round(400_000 * rng()),
        eta: progress >= 100 ? null : Math.round(5000 * rng()),
    };
}
export function createMockDataset(mode = 'deterministic') {
    const rng = createRng(mode === 'deterministic' ? 7 : Date.now());
    return {
        series: Array.from({ length: 14 }, (_unused, index) => buildSeries(rng, index)),
        movies: Array.from({ length: 12 }, (_unused, index) => buildMovie(rng, index)),
        missingMovies: Array.from({ length: 8 }, (_unused, index) => buildMissingMovie(rng, index)),
        indexers: Array.from({ length: 6 }, (_unused, index) => buildIndexer(rng, index)),
        torrents: Array.from({ length: 8 }, (_unused, index) => buildTorrent(rng, index)),
        activity: Array.from({ length: 14 }, (_unused, index) => ({
            id: index + 1,
            eventType: index % 2 === 0 ? 'MEDIA_ADDED' : 'GRAB_RELEASE',
            sourceModule: index % 2 === 0 ? 'library' : 'search',
            summary: index % 2 === 0 ? 'Media added to library' : 'Release grabbed and sent to queue',
            success: true,
            occurredAt: new Date(Date.now() - index * 1000 * 60 * 3).toISOString(),
        })),
        settings: {
            torrentLimits: {
                maxActiveDownloads: 3,
                maxActiveSeeds: 5,
                globalDownloadLimitKbps: null,
                globalUploadLimitKbps: null,
            },
            schedulerIntervals: {
                rssSyncMinutes: 15,
                availabilityCheckMinutes: 30,
                torrentMonitoringSeconds: 5,
            },
            pathVisibility: {
                showDownloadPath: true,
                showMediaPath: true,
            },
        },
    };
}
export function paginate(items, page, pageSize) {
    const totalCount = items.length;
    const totalPages = totalCount > 0 ? Math.ceil(totalCount / Math.max(pageSize, 1)) : 0;
    const start = (Math.max(page, 1) - 1) * Math.max(pageSize, 1);
    return {
        items: items.slice(start, start + pageSize),
        meta: {
            page: Math.max(page, 1),
            pageSize: Math.max(pageSize, 1),
            totalCount,
            totalPages,
        },
    };
}
//# sourceMappingURL=factories.js.map