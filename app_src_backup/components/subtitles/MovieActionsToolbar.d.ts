export interface MovieActionsToolbarProps {
    onSync: () => void;
    onScan: () => void;
    onSearch: () => void;
    onManualSearch: () => void;
    onUpload: () => void;
    onHistory: () => void;
    isSyncing?: boolean;
    isScanning?: boolean;
    isSearching?: boolean;
}
export declare function MovieActionsToolbar({ onSync, onScan, onSearch, onManualSearch, onUpload, onHistory, isSyncing, isScanning, isSearching, }: MovieActionsToolbarProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=MovieActionsToolbar.d.ts.map