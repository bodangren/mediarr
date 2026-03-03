import type { ImportList } from '@/lib/api/importListsApi';
interface ImportListListProps {
    lists: ImportList[];
    isLoading: boolean;
    error: Error | null;
    onEdit: (list: ImportList) => void;
    onDelete: (list: ImportList) => void;
    onSync: (list: ImportList) => void;
    syncingId: number | null;
}
export declare function ImportListList({ lists, isLoading, error, onEdit, onDelete, onSync, syncingId, }: ImportListListProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=ImportListList.d.ts.map