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
interface InteractiveSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    seriesId: number;
    tvdbId?: number;
    episodeId: number | null;
    seriesTitle: string;
    seasonNumber: number;
    episodeNumber?: number;
    episodeTitle?: string;
}
export declare function InteractiveSearchModal({ isOpen, onClose, seriesId, tvdbId, episodeId, seriesTitle, seasonNumber, episodeNumber, episodeTitle, }: InteractiveSearchModalProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=InteractiveSearchModal.d.ts.map