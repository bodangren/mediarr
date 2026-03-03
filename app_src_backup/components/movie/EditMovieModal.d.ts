import type { Movie } from '@/lib/api/movieApi';
export interface EditMovieModalProps {
    isOpen: boolean;
    onClose: () => void;
    movie: Movie;
    onSave?: () => void;
}
export declare function EditMovieModal({ isOpen, onClose, movie, onSave }: EditMovieModalProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=EditMovieModal.d.ts.map