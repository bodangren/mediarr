interface SelectFooterAction {
    label: string;
    onClick: (selectedIds: Array<string | number>) => void;
}
interface SelectFooterProps {
    actions: SelectFooterAction[];
}
export declare function SelectFooter({ actions }: SelectFooterProps): import("react/jsx-runtime").JSX.Element | null;
export {};
//# sourceMappingURL=SelectFooter.d.ts.map