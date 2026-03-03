import { type ColumnPreference } from '@/lib/table/columns';
interface TableOptionsModalProps {
    title: string;
    columns: ColumnPreference[];
    onChange: (columns: ColumnPreference[]) => void;
    onClose: () => void;
}
interface DragItem {
    index: number;
}
export declare function reorderOnHover(columns: ColumnPreference[], dragIndex: number, hoverIndex: number): ColumnPreference[];
export declare function applyHoverReorder(columns: ColumnPreference[], item: DragItem, hoverIndex: number, onChange: (columns: ColumnPreference[]) => void): void;
export declare function TableOptionsModal({ title, columns, onChange, onClose }: TableOptionsModalProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=TableOptionsModal.d.ts.map