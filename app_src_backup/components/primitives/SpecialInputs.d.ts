interface PasswordInputProps {
    id: string;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    placeholder?: string;
    error?: string;
}
interface PathInputProps {
    id: string;
    value: string;
    onChange: (value: string) => void;
    onBrowse?: () => void;
    disabled?: boolean;
    placeholder?: string;
}
interface NumberInputProps {
    id: string;
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
}
interface AutoCompleteInputProps {
    id: string;
    value: string;
    suggestions: string[];
    onChange: (value: string) => void;
    onSelect?: (value: string) => void;
    disabled?: boolean;
    placeholder?: string;
}
export declare function PasswordInput({ id, value, onChange, disabled, placeholder, error }: PasswordInputProps): import("react/jsx-runtime").JSX.Element;
export declare function PathInput({ id, value, onChange, onBrowse, disabled, placeholder }: PathInputProps): import("react/jsx-runtime").JSX.Element;
export declare function NumberInput({ id, value, onChange, min, max, step, disabled }: NumberInputProps): import("react/jsx-runtime").JSX.Element;
export declare function AutoCompleteInput({ id, value, suggestions, onChange, onSelect, disabled, placeholder, }: AutoCompleteInputProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=SpecialInputs.d.ts.map