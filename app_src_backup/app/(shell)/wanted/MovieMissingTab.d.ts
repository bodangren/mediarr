import { type MissingMovie } from '@/lib/api/wantedApi';
export interface MovieMissingTabProps {
    onSearchMovie: (movie: MissingMovie) => void;
    onBulkSearch: (movies: MissingMovie[]) => void;
}
export declare function MovieMissingTab({ onSearchMovie, onBulkSearch }: MovieMissingTabProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=MovieMissingTab.d.ts.map