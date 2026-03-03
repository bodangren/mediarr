import type { ButtonHTMLAttributes, ReactNode } from 'react';
type ButtonVariant = 'primary' | 'secondary' | 'danger';
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    children: ReactNode;
}
export declare function Button({ variant, children, className, ...props }: ButtonProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=Button.d.ts.map