import type { ReactNode } from 'react';
interface PageToolbarButtonProps {
    icon: ReactNode;
    label: string;
    onClick?: () => void;
    disabled?: boolean;
    loading?: boolean;
    isActive?: boolean;
    ariaLabel?: string;
}
export declare function PageToolbarButton({ icon, label, onClick, disabled, loading, isActive, ariaLabel, }: PageToolbarButtonProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=PageToolbarButton.d.ts.map