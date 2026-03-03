import type { MovieFile } from '@/types/movie';
export interface MovieFileTableProps {
    files: MovieFile[];
    onEdit?: (file: MovieFile) => void;
    onDelete?: (file: MovieFile) => void;
}
export declare function MovieFileTable({ files, onEdit, onDelete }: MovieFileTableProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=MovieFileTable.d.ts.map