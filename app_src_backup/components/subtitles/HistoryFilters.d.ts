export interface FilterState {
    provider?: string;
    languageCode?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
}
interface HistoryFiltersProps {
    filters: FilterState;
    onChange: (filters: FilterState) => void;
    providers: string[];
    languages: string[];
    actions: string[];
}
export declare function HistoryFilters({ filters, onChange, providers, languages, actions, }: HistoryFiltersProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=HistoryFilters.d.ts.map