import { type MovieListItem } from '@/types/movie';
interface MovieOverviewViewProps {
    items: MovieListItem[];
    onToggleMonitored: (id: number, monitored: boolean) => void;
    onDelete?: (id: number) => void;
    onSearch?: (id: number) => void;
    isLoading?: boolean;
}
export declare function MovieOverviewView({ items, onToggleMonitored, onDelete, onSearch, isLoading }: MovieOverviewViewProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=MovieOverviewView.d.ts.map