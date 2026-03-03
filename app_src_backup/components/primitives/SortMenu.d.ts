export interface SortMenuOption {
    key: string;
    label: string;
}
export type SortDirection = 'asc' | 'desc';
interface SortMenuProps {
    options: SortMenuOption[];
    value: string;
    direction: SortDirection;
    label?: string;
    onChange: (key: string) => void;
    onDirectionChange: (direction: SortDirection) => void;
}
export declare function SortMenu({ options, value, direction, label, onChange, onDirectionChange, }: SortMenuProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=SortMenu.d.ts.map