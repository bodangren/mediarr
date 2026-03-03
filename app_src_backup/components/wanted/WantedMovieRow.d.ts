import type { MissingMovie } from '@/types/wanted';
export interface WantedMovieRowProps {
    movie: MissingMovie;
    onSearch: (movie: MissingMovie) => void;
    onEdit: (movie: MissingMovie) => void;
    onDelete: (movie: MissingMovie) => void;
    onToggleMonitored: (movieId: number, monitored: boolean) => void;
    selected?: boolean;
    onSelect: (movieId: number) => void;
}
export declare function getStatusBadgeColor(status: MissingMovie['status']): string;
export declare function getStatusLabel(status: MissingMovie['status']): string;
export declare function WantedMovieRow({ movie, onSearch, onEdit, onDelete, onToggleMonitored, selected, onSelect, }: WantedMovieRowProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=WantedMovieRow.d.ts.map