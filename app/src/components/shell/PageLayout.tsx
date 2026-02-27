'use client';

import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import * as Icons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Modal, ModalHeader, ModalBody } from '@/components/primitives/Modal';
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
  const iconRegistry = Icons as unknown as Record<string, LucideIcon>;
  const IconComponent = iconRegistry[name];

  if (!IconComponent) {
    return null;
  }

  return <IconComponent className="h-4 w-4" />;
}

// Flatten navigation sections for mobile bottom nav
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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
  const allNavItems = flattenNavItems(navItems);
  const primaryNavItems = allNavItems.slice(0, 4); // First 4 items in bottom nav
  const overflowNavItems = allNavItems.slice(4); // Remaining items in More menu

  return (
    <div className="min-h-screen bg-surface-0 text-text-primary">
      <div
        className={`mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 ${
          sidebarCollapsed ? 'lg:grid-cols-[88px_1fr]' : 'lg:grid-cols-[240px_1fr]'
        }`}
      >
        <PageSidebar
          pathname={pathname}
          collapsed={sidebarCollapsed}
          onToggle={onToggleSidebar}
          items={navItems}
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
        />

        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border-subtle bg-surface-1/90 px-4 py-3 backdrop-blur lg:gap-0">
            {/* Mobile menu button */}
            <button
              type="button"
              className="rounded-sm p-1 text-text-secondary hover:bg-surface-2 lg:hidden"
              onClick={() => setIsMobileSidebarOpen(true)}
              aria-label="Open navigation menu"
            >
              <Icons.Menu className="h-5 w-5" />
            </button>

            <div className="flex-1">{header}</div>
          </header>

          <main className="flex-1 px-3 pb-20 pt-3 sm:px-4 sm:pt-4 lg:pb-4">{children}</main>
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-20 border-t border-border-subtle bg-surface-1 px-2 py-1 lg:hidden"
        aria-label="Mobile Navigation"
      >
        <ul className="grid grid-cols-5 gap-1">
          {primaryNavItems.map(item => {
            const active = isNavActive(pathname, item.path);
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className="flex h-full min-h-[44px] flex-col items-center justify-center rounded-sm px-1 py-1.5 text-[10px] sm:px-2 sm:py-2 sm:text-[11px]"
                  aria-current={active ? 'page' : undefined}
                >
                  <LucideIcon name={item.icon} />
                  <span className="mt-0.5 truncate">{item.shortLabel}</span>
                </Link>
              </li>
            );
          })}
          {/* More button with overflow menu */}
          <li>
            <button
              type="button"
              className="flex h-full min-h-[44px] flex-col items-center justify-center rounded-sm px-1 py-1.5 text-[10px] sm:px-2 sm:py-2 sm:text-[11px]"
              onClick={() => setIsMobileMoreOpen(true)}
              aria-label="More navigation options"
              aria-expanded={isMobileMoreOpen}
            >
              <Icons.MoreHorizontal className="h-4 w-4" />
              <span className="mt-0.5">More</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* Mobile More overflow modal */}
      <Modal
        isOpen={isMobileMoreOpen}
        ariaLabel="More navigation"
        onClose={() => setIsMobileMoreOpen(false)}
        maxWidthClassName="max-w-md"
      >
        <ModalHeader title="More" onClose={() => setIsMobileMoreOpen(false)} />
        <ModalBody>
          <ul className="space-y-1" role="menu">
            {overflowNavItems.map(item => {
              const active = isNavActive(pathname, item.path);
              return (
                <li key={item.path} role="none">
                  <Link
                    to={item.path}
                    role="menuitem"
                    className={`flex items-center gap-3 rounded-sm px-3 py-2 text-sm ${
                      active ? 'bg-accent-primary/20 text-accent-primary' : 'hover:bg-surface-2'
                    }`}
                    onClick={() => setIsMobileMoreOpen(false)}
                  >
                    <LucideIcon name={item.icon} />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </ModalBody>
      </Modal>
    </div>
  );
}
