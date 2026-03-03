export type SeriesColumnKey = 'title' | 'network' | 'genres' | 'rating' | 'seasons' | 'episodes' | 'size' | 'nextAiring' | 'status';
export interface SeriesColumnOption {
    key: SeriesColumnKey;
    label: string;
}
interface ColumnPickerProps {
    options: SeriesColumnOption[];
    visibleColumns: SeriesColumnKey[];
    onChange: (columns: SeriesColumnKey[]) => void;
}
export declare function ColumnPicker({ options, visibleColumns, onChange }: ColumnPickerProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=ColumnPicker.d.ts.map