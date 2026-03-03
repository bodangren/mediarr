export interface NavigationItem {
    path: string;
    label: string;
    shortLabel: string;
    icon: string;
    showBadge?: boolean;
}
export interface NavigationSection {
    id: string;
    label: string;
    items: NavigationItem[];
}
export declare const NAV_ITEMS: NavigationSection[];
export interface BreadcrumbItem {
    href: string;
    label: string;
}
export declare function buildBreadcrumbs(pathname: string): BreadcrumbItem[];
export declare function isNavActive(pathname: string, target: string): boolean;
//# sourceMappingURL=navigation.d.ts.map