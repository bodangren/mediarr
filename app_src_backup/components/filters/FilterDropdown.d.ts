import type { CustomFilter } from '@/lib/api/filters';
interface FilterDropdownProps {
    filters: CustomFilter[];
    selectedFilterId: number | 'custom' | null;
    onSelectFilter: (value: number | 'custom' | null) => void;
    onOpenBuilder: () => void;
    label?: string;
    allLabel?: string;
    id?: string;
}
export declare function FilterDropdown({ filters, selectedFilterId, onSelectFilter, onOpenBuilder, label, allLabel, id, }: FilterDropdownProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=FilterDropdown.d.ts.map