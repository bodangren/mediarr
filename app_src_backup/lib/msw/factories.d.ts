export type FactoryMode = 'deterministic' | 'random';
export interface MockSeriesEpisode {
    id: number;
    episodeNumber: number;
    seasonNumber: number;
    title: string;
    monitored: boolean;
    path: string | null;
}
export interface MockSeries {
    id: number;
    tvdbId: number;
    title: string;
    year: number;
    status: string;
    monitored: boolean;
    seasons: Array<{
        seasonNumber: number;
        monitored: boolean;
        episodes: MockSeriesEpisode[];
    }>;
}
export interface MockMovie {
    id: number;
    tmdbId: number;
    title: string;
    year: number;
    status: string;
    monitored: boolean;
    fileVariants: Array<{
        id: number;
        path: string;
    }>;
}
export interface MockMissingMovie {
    id: number;
    movieId: number;
    title: string;
    year: number;
    posterUrl?: string;
    status: 'missing' | 'announced' | 'incinemas' | 'released';
    monitored: boolean;
    cinemaDate?: string;
    physicalRelease?: string;
    digitalRelease?: string;
    qualityProfileId: number;
    qualityProfileName?: string;
    runtime?: number;
    certification?: string;
    genres?: string[];
}
export interface MockIndexer {
    id: number;
    name: string;
    implementation: string;
    configContract: string;
    settings: string;
    protocol: string;
    enabled: boolean;
    supportsRss: boolean;
    supportsSearch: boolean;
    priority: number;
    health: {
        failureCount: number;
        lastErrorMessage: string | null;
    } | null;
}
export interface MockTorrent {
    infoHash: string;
    name: string;
    status: string;
    progress: number;
    size: string;
    downloaded: string;
    uploaded: string;
    downloadSpeed: number;
    uploadSpeed: number;
    eta: number | null;
}
export interface MockDataset {
    series: MockSeries[];
    movies: MockMovie[];
    missingMovies: MockMissingMovie[];
    indexers: MockIndexer[];
    torrents: MockTorrent[];
    activity: Array<{
        id: number;
        eventType: string;
        sourceModule: string;
        summary: string;
        success: boolean;
        occurredAt: string;
    }>;
    settings: {
        torrentLimits: {
            maxActiveDownloads: number;
            maxActiveSeeds: number;
            globalDownloadLimitKbps: number | null;
            globalUploadLimitKbps: number | null;
        };
        schedulerIntervals: {
            rssSyncMinutes: number;
            availabilityCheckMinutes: number;
            torrentMonitoringSeconds: number;
        };
        pathVisibility: {
            showDownloadPath: boolean;
            showMediaPath: boolean;
        };
    };
}
export declare function createMockDataset(mode?: FactoryMode): MockDataset;
export declare function paginate<T>(items: T[], page: number, pageSize: number): {
    items: T[];
    meta: {
        page: number;
        pageSize: number;
        totalCount: number;
        totalPages: number;
    };
};
//# sourceMappingURL=factories.d.ts.map