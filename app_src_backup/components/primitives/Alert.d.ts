import type { ReactNode } from 'react';
type AlertVariant = 'info' | 'success' | 'warning' | 'danger';
interface AlertProps {
    variant?: AlertVariant;
    children: ReactNode;
}
export declare function Alert({ variant, children }: AlertProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=Alert.d.ts.map