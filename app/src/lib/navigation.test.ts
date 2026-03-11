import { describe, expect, it } from 'vitest';
import { NAV_ITEMS, isNavActive, type NavigationSection } from './navigation';

describe('unified monolith navigation', () => {
  it('defines the expected top-level sections', () => {
    const sectionIds = NAV_ITEMS.map(section => section.id);
    expect(sectionIds).toEqual([
      'dashboard',
      'library',
      'calendar',
      'activity',
      'settings',
      'system',
    ]);
  });

  it('exposes a unified library section', () => {
    const library = NAV_ITEMS.find(section => section.id === 'library');
    const paths = library?.items.map(item => item.path) ?? [];

    expect(paths).toEqual(['/library/movies', '/library/tv', '/library/collections']);
  });

  it('exposes unified system actions', () => {
    const system = NAV_ITEMS.find(section => section.id === 'system');
    const paths = system?.items.map(item => item.path) ?? [];

    expect(paths).toEqual(['/system/tasks', '/system/logs', '/system/events', '/system/backup', '/system/stats']);
  });

  it('includes streaming settings route in the settings section', () => {
    const settings = NAV_ITEMS.find(section => section.id === 'settings');
    const paths = settings?.items.map(item => item.path) ?? [];

    expect(paths).toContain('/settings/streaming');
  });

  it('keeps icons and short labels for all nav items', () => {
    const sections = NAV_ITEMS as NavigationSection[];

    sections.forEach(section => {
      section.items.forEach(item => {
        expect(item.icon).toBeTruthy();
        expect(item.shortLabel).toBeTruthy();
      });
    });
  });

  it('matches active routes using nested path prefix logic', () => {
    expect(isNavActive('/settings/indexers', '/settings')).toBe(true);
    expect(isNavActive('/system/logs/files', '/system/logs')).toBe(true);
    expect(isNavActive('/library/tv/42', '/library/tv')).toBe(true);
    expect(isNavActive('/calendar', '/dashboard')).toBe(false);
    expect(isNavActive('/dashboard', '/')).toBe(true);
    expect(isNavActive('/', '/')).toBe(false);
  });
});
