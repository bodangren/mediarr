import type { ReactNode } from 'react';
type LabelTone = 'info' | 'success' | 'warning' | 'danger';
interface LabelProps {
    tone?: LabelTone;
    children: ReactNode;
}
export declare function Label({ tone, children }: LabelProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=Label.d.ts.map