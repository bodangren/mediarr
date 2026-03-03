import type { ReactNode } from 'react';
interface PageToolbarProps {
    children: ReactNode;
}
interface PageToolbarSectionProps {
    children: ReactNode;
    align?: 'left' | 'right';
}
export declare function PageToolbar({ children }: PageToolbarProps): import("react/jsx-runtime").JSX.Element;
export declare function PageToolbarSection({ children, align }: PageToolbarSectionProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=PageToolbar.d.ts.map