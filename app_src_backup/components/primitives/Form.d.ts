import { type FormEventHandler, type ReactNode } from 'react';
interface OptionItem {
    value: string;
    label: string;
}
interface FormProps {
    children: ReactNode;
    onSubmit?: FormEventHandler<HTMLFormElement>;
    className?: string;
}
interface FormGroupProps {
    label: ReactNode;
    htmlFor?: string;
    hint?: ReactNode;
    error?: ReactNode;
    children: ReactNode;
}
interface TextInputProps {
    id: string;
    value: string;
    onChange: (value: string) => void;
    type?: 'text' | 'password' | 'email' | 'url' | 'search';
    placeholder?: string;
    disabled?: boolean;
    error?: string;
    ariaLabel?: string;
}
interface SelectInputProps {
    id: string;
    label: string;
    value: string;
    options: OptionItem[];
    onChange: (value: string) => void;
    disabled?: boolean;
}
interface EnhancedSelectInputProps {
    id: string;
    label: string;
    value: string;
    options: OptionItem[];
    onChange: (value: string) => void;
    disabled?: boolean;
}
interface CheckInputProps {
    id: string;
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
}
interface TagInputProps {
    id: string;
    label: string;
    availableTags: string[];
    selectedTags: string[];
    onChange: (tags: string[]) => void;
    disabled?: boolean;
}
interface PasswordInputProps {
    id: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    error?: string;
    ariaLabel?: string;
}
export declare function Form({ children, onSubmit, className }: FormProps): import("react/jsx-runtime").JSX.Element;
export declare function FormGroup({ label, htmlFor, hint, error, children }: FormGroupProps): import("react/jsx-runtime").JSX.Element;
export declare function TextInput({ id, value, onChange, type, placeholder, disabled, error, ariaLabel, }: TextInputProps): import("react/jsx-runtime").JSX.Element;
export declare function SelectInput({ id, label, value, options, onChange, disabled }: SelectInputProps): import("react/jsx-runtime").JSX.Element;
export declare function EnhancedSelectInput({ id, label, value, options, onChange, disabled }: EnhancedSelectInputProps): import("react/jsx-runtime").JSX.Element;
export declare function CheckInput({ id, label, checked, onChange, disabled }: CheckInputProps): import("react/jsx-runtime").JSX.Element;
export declare function TagInput({ id, label, availableTags, selectedTags, onChange, disabled }: TagInputProps): import("react/jsx-runtime").JSX.Element;
export declare function PasswordInput({ id, value, onChange, placeholder, disabled, error, ariaLabel, }: PasswordInputProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=Form.d.ts.map