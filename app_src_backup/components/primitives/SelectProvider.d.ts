import { type ReactNode } from 'react';
type RowId = string | number;
interface SelectContextValue {
    selectedIds: RowId[];
    isSelected: (id: RowId) => boolean;
    toggleRow: (id: RowId, shiftKey?: boolean) => void;
    clearSelection: () => void;
}
interface SelectProviderProps {
    rowIds: RowId[];
    children: ReactNode;
}
export declare function SelectProvider({ rowIds, children }: SelectProviderProps): import("react/jsx-runtime").JSX.Element;
export declare function useSelectContext(): SelectContextValue;
export {};
//# sourceMappingURL=SelectProvider.d.ts.map