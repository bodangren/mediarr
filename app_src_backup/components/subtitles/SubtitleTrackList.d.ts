import type { SubtitleTrack } from '@/lib/api/subtitleApi';
export interface SubtitleTrackListProps {
    tracks: SubtitleTrack[];
    missingLanguages: string[];
    onSearch: (languageCode: string) => void;
    onDelete?: (trackId: number) => void;
    onDownload?: (track: SubtitleTrack) => void;
    className?: string;
}
export declare function SubtitleTrackList({ tracks, missingLanguages, onSearch, onDelete, onDownload, className, }: SubtitleTrackListProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=SubtitleTrackList.d.ts.map