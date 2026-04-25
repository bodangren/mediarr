
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
  const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];

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
  // eslint-disable-next-line react-hooks/rules-of-hooks
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
      <aside className="hidden bg-black p-8 lg:block">
        <div
          className={`mb-12 flex items-center ${collapsed ? 'justify-center' : 'justify-between gap-4'}`}
        >
          <p className="text-sm font-bold tracking-[0.2em] text-white">{collapsed ? 'M' : 'MEDIARR'}</p>
          <button
            type="button"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="text-text-secondary hover:text-white transition-colors"
            onClick={onToggle}
          >
            {collapsed ? <Icons.ChevronRight className="h-5 w-5" /> : <Icons.ChevronLeft className="h-5 w-5" />}
          </button>
        </div>
        <nav className="space-y-8" aria-label="Sidebar Navigation">
          {items.map(section => {
            const isCollapsed = collapsedSections.has(section.id);

            return (
              <div key={section.id}>
                {!collapsed && (
                  <button
                    type="button"
                    className="mb-4 flex w-full items-center justify-between text-[10px] font-bold uppercase tracking-[0.3em] text-text-muted hover:text-white transition-colors"
                    onClick={() => toggleSection(section.id)}
                    aria-expanded={!isCollapsed}
                    aria-controls={`section-${section.id}`}
                  >
                    <span>{section.label}</span>
                  </button>
                )}
                {!isCollapsed && (
                  <ul className="space-y-4">
                    {section.items.map(item => {
                      const active = isNavActive(pathname, item.path);
                      return (
                        <li key={item.path}>
                          <Link
                            to={item.path}
                            className={`flex items-center gap-4 text-sm transition-all ${
                              active
                                ? 'text-white'
                                : 'text-text-secondary hover:text-white'
                            } ${collapsed ? 'justify-center' : ''}`}
                            aria-current={active ? 'page' : undefined}
                          >
                            <div className="relative">
                              <LucideIcon name={item.icon} />
                              {active && !collapsed && (
                                <div className="absolute -left-4 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-white" />
                              )}
                            </div>
                            {!collapsed && (
                              <>
                                <span>{item.label}</span>
                                {item.showBadge && <WantedCountBadge className="ml-auto bg-white text-black rounded-full" />}
                              </>
                            )}
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
            className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Mobile sidebar */}
          <aside
            ref={sidebarRef}
            className="fixed left-0 top-0 z-50 h-full w-full bg-black p-12 lg:hidden"
            aria-label="Mobile Navigation"
          >
            <div className="mb-12 flex items-center justify-between">
              <p className="text-sm font-bold tracking-[0.2em] text-white">MEDIARR</p>
              <button
                type="button"
                aria-label="Close sidebar"
                className="text-text-secondary hover:text-white"
                onClick={onClose}
              >
                <Icons.X className="h-8 w-8" />
              </button>
            </div>
            <nav className="space-y-10">
              {items.map(section => {
                const isCollapsed = collapsedSections.has(section.id);

                return (
                  <div key={section.id}>
                    <button
                      type="button"
                      className="mb-6 flex w-full items-center justify-between text-[10px] font-bold uppercase tracking-[0.3em] text-text-muted"
                      onClick={() => toggleSection(section.id)}
                      aria-expanded={!isCollapsed}
                      aria-controls={`section-${section.id}`}
                    >
                      <span>{section.label}</span>
                    </button>
                    {!isCollapsed && (
                      <ul className="space-y-6">
                        {section.items.map(item => {
                          const active = isNavActive(pathname, item.path);
                          return (
                            <li key={item.path}>
                              <Link
                                to={item.path}
                                onClick={onClose}
                                className={`flex items-center gap-6 text-xl transition-colors ${
                                  active
                                    ? 'text-white'
                                    : 'text-text-secondary hover:text-white'
                                }`}
                                aria-current={active ? 'page' : undefined}
                              >
                                <LucideIcon name={item.icon} />
                                <span>{item.label}</span>
                                {item.showBadge && <WantedCountBadge className="ml-auto bg-white text-black rounded-full" />}
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
