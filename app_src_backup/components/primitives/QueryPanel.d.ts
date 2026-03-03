import type { ReactNode } from 'react';
interface QueryPanelProps {
    isLoading: boolean;
    isError: boolean;
    isEmpty: boolean;
    errorMessage?: string;
    onRetry?: () => void;
    emptyTitle: string;
    emptyBody: string;
    children: ReactNode;
}
export declare function QueryPanel({ isLoading, isError, isEmpty, errorMessage, onRetry, emptyTitle, emptyBody, children, }: QueryPanelProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=QueryPanel.d.ts.map