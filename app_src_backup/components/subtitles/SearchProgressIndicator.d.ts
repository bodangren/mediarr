export interface SearchProgressIndicatorProps {
    isSearching: boolean;
    progress: {
        total: number;
        completed: number;
        failed: number;
    };
    onDismiss?: () => void;
}
export declare function SearchProgressIndicator({ isSearching, progress, onDismiss, }: SearchProgressIndicatorProps): import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=SearchProgressIndicator.d.ts.map