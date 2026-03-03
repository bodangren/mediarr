import { type DiscoverFilters } from '@/types/discover';
interface DiscoverFiltersProps {
    filters: DiscoverFilters;
    onChange: (filters: DiscoverFilters) => void;
    onApply: () => void;
    onClear: () => void;
}
export declare function DiscoverFilters({ filters, onChange, onApply, onClear }: DiscoverFiltersProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=DiscoverFilters.d.ts.map