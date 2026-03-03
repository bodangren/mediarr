import { type SeriesListItem } from '@/types/series';
interface OverviewViewProps {
    items: SeriesListItem[];
    onToggleMonitored: (id: number, monitored: boolean) => void;
    onDelete?: (id: number) => void;
    onRefresh?: (id: number) => void;
}
export declare function SeriesOverviewView({ items, onToggleMonitored, onDelete, onRefresh }: OverviewViewProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=SeriesOverviewView.d.ts.map