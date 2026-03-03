import { type ComponentType, type ReactNode } from 'react';
export type MenuAlign = 'left' | 'right';
export interface MenuItem {
    key: string;
    label: string;
    icon?: ComponentType<{
        className?: string;
        size?: number;
    }>;
    disabled?: boolean;
    divider?: boolean;
    onClick?: () => void;
}
interface MenuProps {
    isOpen: boolean;
    onClose: () => void;
    items: MenuItem[];
    align?: MenuAlign;
    className?: string;
    ariaLabel?: string;
}
interface MenuTriggerProps {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    ariaLabel?: string;
}
export declare function MenuTrigger({ children, onClick, disabled, ariaLabel }: MenuTriggerProps): import("react/jsx-runtime").JSX.Element;
export declare function Menu({ isOpen, onClose, items, align, className, ariaLabel, }: MenuProps): import("react/jsx-runtime").JSX.Element | null;
export declare function MenuButton({ items, align, ariaLabel, children, }: {
    items: MenuItem[];
    align?: MenuAlign;
    ariaLabel?: string;
    children: ReactNode;
}): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=Menu.d.ts.map