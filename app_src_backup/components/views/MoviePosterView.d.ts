import { type MovieListItem } from '@/types/movie';
interface MoviePosterViewProps {
    items: MovieListItem[];
    onToggleMonitored: (id: number, monitored: boolean) => void;
    onDelete?: (id: number) => void;
    onSearch?: (id: number) => void;
    isLoading?: boolean;
}
export declare function MoviePosterView({ items, onToggleMonitored, onDelete, onSearch, isLoading }: MoviePosterViewProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=MoviePosterView.d.ts.map