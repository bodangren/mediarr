'use client';

import { useState } from 'react';
import Link from 'next/link';
import * as Icons from 'lucide-react';
import { NAV_ITEMS, isNavActive, type NavigationSection } from '@/lib/navigation';

interface PageSidebarProps {
  pathname: string;
  collapsed: boolean;
  onToggle: () => void;
  items?: NavigationSection[];
}

// Icon mapping component
function LucideIcon({ name }: { name: string }) {
  const IconComponent = (Icons as any)[name];

  if (!IconComponent) {
    return null;
  }

  return <IconComponent className="h-4 w-4" />;
}

export function PageSidebar({
  pathname,
  collapsed,
  onToggle,
  items = NAV_ITEMS,
}: PageSidebarProps) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  return (
    <aside className="hidden border-r border-border-subtle bg-surface-1 p-4 lg:block">
      <div className={`mb-4 flex items-center ${collapsed ? 'justify-center' : 'justify-between gap-2'}`}>
        <p className="text-xs uppercase tracking-wide text-text-muted">{collapsed ? 'MR' : 'Mediarr'}</p>
        <button
          type="button"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="rounded-sm border border-border-subtle px-2 py-1 text-xs text-text-secondary hover:text-text-primary"
          onClick={onToggle}
        >
          {collapsed ? '>' : '<'}
        </button>
      </div>
      <nav className="space-y-4" aria-label="Sidebar Navigation">
        {items.map(section => {
          const isCollapsed = collapsedSections.has(section.id);

          return (
            <div key={section.id}>
              {!collapsed && (
                <button
                  type="button"
                  className="mb-2 flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-text-muted hover:text-text-primary"
                  onClick={() => toggleSection(section.id)}
                  aria-expanded={!isCollapsed}
                  aria-controls={`section-${section.id}`}
                >
                  <span>{section.label}</span>
                  <span className="text-xs">{isCollapsed ? '+' : '-'}</span>
                </button>
              )}
              {!isCollapsed && (
                <ul className={`space-y-1 ${collapsed ? '' : ''}`}>
                  {section.items.map(item => {
                    const active = isNavActive(pathname, item.path);
                    return (
                      <li key={item.path}>
                        <Link
                          href={item.path}
                          className={`flex items-center gap-2 rounded-sm px-3 py-2 text-sm ${
                            active ? 'bg-accent-primary/20 text-text-primary' : 'text-text-secondary hover:bg-surface-2'
                          } ${collapsed ? 'justify-center' : ''}`}
                          aria-current={active ? 'page' : undefined}
                        >
                          <LucideIcon name={item.icon} />
                          {!collapsed && <span>{item.label}</span>}
                          {collapsed && <span className="text-xs">{item.shortLabel}</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
