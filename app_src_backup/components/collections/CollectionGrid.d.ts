import type { MovieCollection } from '@/types/collection';
interface CollectionGridProps {
    collections: MovieCollection[];
    onToggleMonitored: (id: number, monitored: boolean) => void;
    onSearch: (id: number) => void;
    onEdit: (collection: MovieCollection) => void;
    onDelete: (id: number) => void;
}
export declare function CollectionGrid({ collections, onToggleMonitored, onSearch, onEdit, onDelete, }: CollectionGridProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=CollectionGrid.d.ts.map