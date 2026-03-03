import type { ReactNode } from 'react';
interface PageProps {
    title: string;
    headerActions?: ReactNode;
    onMenuToggle: () => void;
    children: ReactNode;
}
export declare function Page({ title, headerActions, onMenuToggle, children }: PageProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=Page.d.ts.map