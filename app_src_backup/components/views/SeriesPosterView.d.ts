import { type SeriesListItem } from '@/types/series';
interface PosterViewProps {
    items: SeriesListItem[];
    onToggleMonitored: (id: number, monitored: boolean) => void;
    onDelete?: (id: number) => void;
    onRefresh?: (id: number) => void;
}
export declare function SeriesPosterView({ items, onToggleMonitored, onDelete, onRefresh }: PosterViewProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=SeriesPosterView.d.ts.map