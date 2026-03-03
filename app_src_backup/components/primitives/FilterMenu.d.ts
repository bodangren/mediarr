export interface FilterMenuOption {
    key: string;
    label: string;
}
export type FilterValue = string | {
    type: 'custom';
    conditions: unknown;
};
export interface CustomFilter {
    type: 'custom';
    conditions: unknown;
}
interface FilterMenuProps {
    label?: string;
    value: string;
    options: FilterMenuOption[];
    onChange: (key: string) => void;
    onCustomFilter?: () => void;
    customFilterActive?: boolean;
}
export declare function FilterMenu({ label, value, options, onChange, onCustomFilter, customFilterActive, }: FilterMenuProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=FilterMenu.d.ts.map