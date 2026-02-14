import { describe, expect, it } from 'vitest';
import { PROWLARR_ROUTE_PATHS } from './prowlarrRoutes';
import { isNavActive } from './navigation';

describe('prowlarr route configuration', () => {
  it('contains major prowlarr route paths', () => {
    expect(PROWLARR_ROUTE_PATHS).toEqual(
      expect.arrayContaining([
        '/indexers',
        '/indexers/stats',
        '/search',
        '/history',
        '/settings/indexers',
        '/settings/applications',
        '/settings/downloadclients',
        '/settings/connect',
        '/settings/tags',
        '/settings/general',
        '/settings/ui',
        '/system/status',
        '/system/tasks',
        '/system/backup',
        '/system/updates',
        '/system/events',
        '/system/logs/files',
      ]),
    );
  });

  it('does not contain duplicate paths', () => {
    expect(new Set(PROWLARR_ROUTE_PATHS).size).toBe(PROWLARR_ROUTE_PATHS.length);
  });

  it('keeps active navigation highlighting for nested routes', () => {
    expect(isNavActive('/settings/indexers', '/settings')).toBe(true);
    expect(isNavActive('/system/logs/files', '/system')).toBe(true);
    expect(isNavActive('/history', '/indexers')).toBe(false);
  });
});
