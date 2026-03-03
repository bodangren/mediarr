interface ManualEpisodeMatchDialogProps {
    isOpen: boolean;
    onClose: () => void;
    originalSeriesTitle?: string;
    originalSeasonNumber?: number;
    originalEpisodeNumber?: number;
    onSelect: (match: {
        seriesId: number;
        seasonId: number;
        episodeId: number;
        seriesTitle: string;
    }) => void;
}
export declare function ManualEpisodeMatchDialog({ isOpen, onClose, originalSeriesTitle, originalSeasonNumber, originalEpisodeNumber, onSelect, }: ManualEpisodeMatchDialogProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=ManualEpisodeMatchDialog.d.ts.map