import type { ReactNode } from 'react';
import { type NavigationSection } from '@/lib/navigation';
interface PageLayoutProps {
    pathname: string;
    sidebarCollapsed: boolean;
    onToggleSidebar: () => void;
    header: ReactNode;
    children: ReactNode;
    navItems?: NavigationSection[];
}
export declare function PageLayout({ pathname, sidebarCollapsed, onToggleSidebar, header, children, navItems, }: PageLayoutProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=PageLayout.d.ts.map