declare const LETTERS: string[];
export type JumpFilter = 'All' | '#' | (typeof LETTERS)[number];
interface PageJumpBarProps {
    value: JumpFilter;
    onChange: (value: JumpFilter) => void;
}
export declare function matchesJumpFilter(name: string, filter: JumpFilter): boolean;
export declare function PageJumpBar({ value, onChange }: PageJumpBarProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=PageJumpBar.d.ts.map