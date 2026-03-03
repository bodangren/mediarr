import type { MovieCollection } from '@/types/collection';
interface CollectionCardProps {
    collection: MovieCollection;
    onToggleMonitored: (id: number, monitored: boolean) => void;
    onSearch: (id: number) => void;
    onEdit: (collection: MovieCollection) => void;
    onDelete: (id: number) => void;
}
export declare function CollectionCard({ collection, onToggleMonitored, onSearch, onEdit, onDelete, }: CollectionCardProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=CollectionCard.d.ts.map