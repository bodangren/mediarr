export interface MovieActionsToolbarProps {
    onRefresh?: () => void;
    onSearch?: () => void;
    onInteractiveSearch?: () => void;
    onPreviewRename?: () => void;
    onManageFiles?: () => void;
    onHistory?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    isRefreshing?: boolean;
    isSearching?: boolean;
}
export declare function MovieActionsToolbar({ onRefresh, onSearch, onInteractiveSearch, onPreviewRename, onManageFiles, onHistory, onEdit, onDelete, isRefreshing, isSearching, }: MovieActionsToolbarProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=MovieActionsToolbar.d.ts.map