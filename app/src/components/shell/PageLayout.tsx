'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import * as Icons from 'lucide-react';
import { NAV_ITEMS, isNavActive, type NavigationSection, type NavigationItem } from '@/lib/navigation';
import { PageSidebar } from './PageSidebar';

interface PageLayoutProps {
  pathname: string;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  header: ReactNode;
  children: ReactNode;
  navItems?: NavigationSection[];
}

// Icon mapping component
function LucideIcon({ name }: { name: string }) {
  const IconComponent = (Icons as any)[name];

  if (!IconComponent) {
    return null;
  }

  return <IconComponent className="h-4 w-4" />;
}

// Flatten navigation sections for mobile
function flattenNavItems(sections: NavigationSection[]): NavigationItem[] {
  return sections.flatMap(section => section.items);
}

export function PageLayout({
  pathname,
  sidebarCollapsed,
  onToggleSidebar,
  header,
  children,
  navItems = NAV_ITEMS,
}: PageLayoutProps) {
  const mobileNavItems = flattenNavItems(navItems).slice(0, 5);

  return (
    <div className="min-h-screen bg-surface-0 text-text-primary">
      <div
        className={`mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 ${
          sidebarCollapsed ? 'lg:grid-cols-[88px_1fr]' : 'lg:grid-cols-[240px_1fr]'
        }`}
      >
        <PageSidebar pathname={pathname} collapsed={sidebarCollapsed} onToggle={onToggleSidebar} items={navItems} />

        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-20 border-b border-border-subtle bg-surface-1/90 px-4 py-3 backdrop-blur">
            {header}
          </header>

          <main className="flex-1 px-4 pb-20 pt-4 lg:pb-4">{children}</main>
        </div>
      </div>

      <nav
        className="fixed bottom-0 left-0 right-0 z-20 border-t border-border-subtle bg-surface-1 px-2 py-1 lg:hidden"
        aria-label="Mobile Navigation"
      >
        <ul className="grid grid-cols-5 gap-1">
          {mobileNavItems.map(item => {
            const active = isNavActive(pathname, item.path);
            return (
              <li key={item.path}>
                <Link
                  href={item.path}
                  className={`flex h-full flex-col items-center justify-center rounded-sm px-2 py-2 text-[11px] ${
                    active ? 'bg-accent-primary/20 text-text-primary' : 'text-text-secondary'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  <LucideIcon name={item.icon} />
                  <span className="mt-1">{item.shortLabel}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
