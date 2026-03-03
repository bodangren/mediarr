export type ViewMode = 'poster' | 'overview' | 'table';
export interface ViewMenuOption {
    key: ViewMode;
    label: string;
    icon: React.ComponentType<{
        className?: string;
        size?: number;
    }>;
}
interface ViewMenuProps {
    value: ViewMode;
    onChange: (view: ViewMode) => void;
    label?: string;
}
export declare function ViewMenu({ value, onChange, label }: ViewMenuProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=ViewMenu.d.ts.map