declare const LETTERS: string[];
export type JumpBarValue = 'All' | '#' | (typeof LETTERS)[number];
interface JumpBarProps {
    value: JumpBarValue;
    onChange: (value: JumpBarValue) => void;
}
export declare function JumpBar({ value, onChange }: JumpBarProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=JumpBar.d.ts.map