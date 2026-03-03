import { type ReactNode } from 'react';
type ToastVariant = 'success' | 'error' | 'info' | 'warning';
export interface ToastAction {
    label: string;
    onClick: () => void;
}
export interface ToastInput {
    title: string;
    message?: string;
    variant?: ToastVariant;
    action?: ToastAction;
}
interface ToastContextValue {
    pushToast: (toast: ToastInput) => void;
}
export declare function ToastProvider({ children }: {
    children: ReactNode;
}): import("react/jsx-runtime").JSX.Element;
export declare function useToast(): ToastContextValue;
export {};
//# sourceMappingURL=ToastProvider.d.ts.map