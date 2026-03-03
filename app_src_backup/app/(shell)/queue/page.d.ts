export interface QueueItem {
    id: string;
    movieId?: number;
    movieTitle?: string;
    moviePosterUrl?: string;
    year?: number;
    releaseTitle: string;
    status: 'queued' | 'downloading' | 'importing' | 'completed' | 'failed' | 'paused';
    progress: number;
    size: number;
    downloaded: number;
    speed?: number;
    timeRemaining?: number;
    quality: string;
    language?: string;
    protocol: 'torrent' | 'usenet';
    indexer?: string;
    episodeId?: number;
}
export default function QueuePage(): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=page.d.ts.map