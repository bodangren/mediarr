import { type NavigationSection } from '@/lib/navigation';
interface PageSidebarProps {
    pathname: string;
    collapsed: boolean;
    onToggle: () => void;
    items?: NavigationSection[];
    isOpen?: boolean;
    onClose?: () => void;
}
export declare function PageSidebar({ pathname, collapsed, onToggle, items, isOpen, onClose, }: PageSidebarProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=PageSidebar.d.ts.map