export interface LanguageSelectorProps {
    value: string;
    onChange: (code: string) => void;
    exclude?: string[];
    label?: string;
    id?: string;
    disabled?: boolean;
    className?: string;
}
export declare function LanguageSelector({ value, onChange, exclude, label, id, disabled, className, }: LanguageSelectorProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=LanguageSelector.d.ts.map