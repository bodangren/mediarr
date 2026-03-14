
import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { NAV_ITEMS, isNavActive, type NavigationSection } from '@/lib/navigation';
import { useTouchGestures } from '@/lib/hooks/useTouchGestures';
import { WantedCountBadge } from '@/components/subtitles/WantedCountBadge';

interface PageSidebarProps {
  pathname: string;
  collapsed: boolean;
  onToggle: () => void;
  items?: NavigationSection[];
  isOpen?: boolean;
  onClose?: () => void;
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
  isOpen = false,
  onClose,
}: PageSidebarProps) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Touch gesture support for mobile swipe to close
  useTouchGestures(sidebarRef.current, {
    onSwipeLeft: () => {
      if (isOpen && onClose) {
        onClose();
      }
    },
    threshold: 50,
  });

  // Handle click outside to close on mobile
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        onClose?.();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

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
    <>
      {/* Desktop sidebar */}
      <aside className="hidden border-r border-border-subtle bg-surface-1 p-4 lg:block">
        <div
          className={`mb-4 flex items-center ${collapsed ? 'justify-center' : 'justify-between gap-2'}`}
        >
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
                            to={item.path}
                            className={`flex items-center gap-2 rounded-sm px-3 py-2 text-sm ${
                              active
                                ? 'bg-accent-primary/20 text-text-primary'
                                : 'text-text-secondary hover:bg-surface-2'
                            } ${collapsed ? 'justify-center' : ''}`}
                            aria-current={active ? 'page' : undefined}
                          >
                            <LucideIcon name={item.icon} />
                            {!collapsed && (
                              <>
                                <span>{item.label}</span>
                                {item.showBadge && <WantedCountBadge className="ml-auto" />}
                              </>
                            )}
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

      {/* Mobile sidebar with overlay */}
      {isOpen && (
        <>
          {/* Overlay backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Mobile sidebar */}
          <aside
            ref={sidebarRef}
            className="fixed left-0 top-0 z-50 h-full w-64 border-r border-border-subtle bg-surface-1 p-4 lg:hidden"
            aria-label="Mobile Navigation"
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-wide text-text-muted">Mediarr</p>
              <button
                type="button"
                aria-label="Close sidebar"
                className="rounded-sm border border-border-subtle p-1 text-text-secondary hover:text-text-primary"
                onClick={onClose}
              >
                <Icons.X className="h-4 w-4" />
              </button>
            </div>
            <nav className="space-y-4">
              {items.map(section => {
                const isCollapsed = collapsedSections.has(section.id);

                return (
                  <div key={section.id}>
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
                    {!isCollapsed && (
                      <ul className="space-y-1">
                        {section.items.map(item => {
                          const active = isNavActive(pathname, item.path);
                          return (
                            <li key={item.path}>
                              <Link
                                to={item.path}
                                onClick={onClose}
                                className={`flex items-center gap-2 rounded-sm px-3 py-3 text-sm ${
                                  active
                                    ? 'bg-accent-primary/20 text-text-primary'
                                    : 'text-text-secondary hover:bg-surface-2'
                                }`}
                                aria-current={active ? 'page' : undefined}
                              >
                                <LucideIcon name={item.icon} />
                                <span>{item.label}</span>
                                {item.showBadge && <WantedCountBadge className="ml-auto" />}
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
        </>
      )}
    </>
  );
}
