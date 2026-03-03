interface MovieSearchResult {
    id: number;
    title: string;
    year: number;
    overview?: string;
    posterUrl?: string;
    tmdbId?: number;
    imdbId?: string;
}
interface ManualMatchDialogProps {
    isOpen: boolean;
    onClose: () => void;
    originalTitle?: string;
    originalYear?: number;
    onSelect: (movie: MovieSearchResult) => void;
}
export declare function ManualMatchDialog({ isOpen, onClose, originalTitle, originalYear, onSelect, }: ManualMatchDialogProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=ManualMatchDialog.d.ts.map