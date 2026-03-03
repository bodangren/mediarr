interface QualityInfo {
    quality: {
        name: string;
        resolution: number;
    };
    revision: {
        version: number;
        real: number;
    };
}
export interface ReleaseResult {
    id: string;
    guid: string;
    indexer: string;
    indexerId: number;
    title: string;
    quality: QualityInfo;
    size: number;
    seeders?: number;
    leechers?: number;
    publishDate: string;
    ageHours: number;
    approved: boolean;
    rejections?: string[];
    customFormatScore?: number;
    protocol?: 'torrent' | 'usenet';
}
export interface MovieInteractiveSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    movieId: number;
    movieTitle: string;
    movieYear?: number;
    imdbId?: string;
    tmdbId?: number;
}
export declare function MovieInteractiveSearchModal({ isOpen, onClose, movieId, movieTitle, movieYear, imdbId, tmdbId, }: MovieInteractiveSearchModalProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=MovieInteractiveSearchModal.d.ts.map