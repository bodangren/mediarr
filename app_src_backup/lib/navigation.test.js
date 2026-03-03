import { describe, expect, it } from 'vitest';
import { NAV_ITEMS, isNavActive } from './navigation';
describe('navigation with grouped sections', () => {
    it('exports NavigationItem with optional icon field', () => {
        const item = {
            path: '/test',
            label: 'Test',
            shortLabel: 'Test',
            icon: 'LayoutDashboard',
        };
        expect(item.icon).toBe('LayoutDashboard');
    });
    it('exports NavigationSection type for grouped navigation', () => {
        const section = {
            id: 'test-section',
            label: 'Test Section',
            items: [
                {
                    path: '/test',
                    label: 'Test',
                    shortLabel: 'Test',
                    icon: 'LayoutDashboard',
                },
            ],
        };
        expect(section.id).toBe('test-section');
        expect(section.items).toHaveLength(1);
    });
    it('NAV_ITEMS is an array of NavigationSection with proper grouping', () => {
        expect(NAV_ITEMS).toBeInstanceOf(Array);
        expect(NAV_ITEMS.length).toBeGreaterThan(0);
        const sections = NAV_ITEMS;
        const mediaLibrarySection = sections.find(s => s.id === 'media-library');
        const indexersSection = sections.find(s => s.id === 'indexers-search');
        const systemSection = sections.find(s => s.id === 'system');
        const settingsSection = sections.find(s => s.id === 'settings');
        expect(mediaLibrarySection).toBeDefined();
        expect(mediaLibrarySection?.label).toBe('Media Library');
        expect(mediaLibrarySection?.items).toContainEqual(expect.objectContaining({ path: '/library/series', label: 'Series Library' }));
        expect(mediaLibrarySection?.items).toContainEqual(expect.objectContaining({ path: '/library/movies', label: 'Movie Library' }));
        expect(indexersSection).toBeDefined();
        expect(indexersSection?.label).toBe('Indexers & Search');
        expect(indexersSection?.items).toContainEqual(expect.objectContaining({ path: '/indexers' }));
        expect(indexersSection?.items).toContainEqual(expect.objectContaining({ path: '/search' }));
        expect(systemSection).toBeDefined();
        expect(systemSection?.label).toBe('System');
        expect(systemSection?.items).toContainEqual(expect.objectContaining({ path: '/system/status' }));
        expect(systemSection?.items).toContainEqual(expect.objectContaining({ path: '/system/logs/files' }));
        expect(settingsSection).toBeDefined();
        expect(settingsSection?.label).toBe('Settings');
        expect(settingsSection?.items).toContainEqual(expect.objectContaining({ path: '/settings' }));
        expect(settingsSection?.items).toContainEqual(expect.objectContaining({ path: '/settings/general' }));
    });
    it('all navigation items have icon fields', () => {
        const sections = NAV_ITEMS;
        sections.forEach(section => {
            section.items.forEach(item => {
                expect(item.icon).toBeDefined();
                expect(typeof item.icon).toBe('string');
                expect(item.icon.length).toBeGreaterThan(0);
            });
        });
    });
    it('navigation items use meaningful short labels (no cryptic abbreviations)', () => {
        const sections = NAV_ITEMS;
        const crypticLabels = ['IdxSet', 'DLC', 'Notify', 'Apps'];
        const allShortLabels = sections.flatMap(section => section.items.map(item => item.shortLabel));
        crypticLabels.forEach(label => {
            expect(allShortLabels).not.toContain(label);
        });
    });
    it('isNavActive keeps active navigation highlighting for nested routes', () => {
        expect(isNavActive('/settings/indexers', '/settings')).toBe(true);
        expect(isNavActive('/system/logs/files', '/system')).toBe(true);
        expect(isNavActive('/library/series/123', '/library/series')).toBe(true);
        expect(isNavActive('/history', '/indexers')).toBe(false);
        expect(isNavActive('/', '/')).toBe(true);
        expect(isNavActive('/library/movies', '/')).toBe(false);
    });
    describe('Subtitles navigation', () => {
        it('should have subtitles section with all expected items', () => {
            const subtitlesSection = NAV_ITEMS.find(section => section.id === 'subtitles');
            expect(subtitlesSection).toBeDefined();
            expect(subtitlesSection?.label).toBe('Subtitles');
            expect(subtitlesSection?.items).toHaveLength(10);
        });
        it('should have series and movies navigation items', () => {
            const subtitlesSection = NAV_ITEMS.find(section => section.id === 'subtitles');
            const itemPaths = subtitlesSection?.items.map(item => item.path) ?? [];
            expect(itemPaths).toContain('/subtitles/series');
            expect(itemPaths).toContain('/subtitles/movies');
        });
        it('should have wanted navigation items with showBadge property', () => {
            const subtitlesSection = NAV_ITEMS.find(section => section.id === 'subtitles');
            const wantedSeriesItem = subtitlesSection?.items.find(item => item.path === '/subtitles/wanted/series');
            const wantedMoviesItem = subtitlesSection?.items.find(item => item.path === '/subtitles/wanted/movies');
            expect(wantedSeriesItem?.showBadge).toBe(true);
            expect(wantedMoviesItem?.showBadge).toBe(true);
        });
        it('should have history navigation items', () => {
            const subtitlesSection = NAV_ITEMS.find(section => section.id === 'subtitles');
            const itemPaths = subtitlesSection?.items.map(item => item.path) ?? [];
            expect(itemPaths).toContain('/subtitles/history/series');
            expect(itemPaths).toContain('/subtitles/history/movies');
        });
        it('should have blacklist navigation items', () => {
            const subtitlesSection = NAV_ITEMS.find(section => section.id === 'subtitles');
            const itemPaths = subtitlesSection?.items.map(item => item.path) ?? [];
            expect(itemPaths).toContain('/subtitles/blacklist/series');
            expect(itemPaths).toContain('/subtitles/blacklist/movies');
        });
        it('should have profiles and providers navigation items', () => {
            const subtitlesSection = NAV_ITEMS.find(section => section.id === 'subtitles');
            const itemPaths = subtitlesSection?.items.map(item => item.path) ?? [];
            expect(itemPaths).toContain('/subtitles/profiles');
            expect(itemPaths).toContain('/subtitles/providers');
        });
    });
    describe('Settings subtitles navigation', () => {
        it('should have subtitles in settings section', () => {
            const settingsSection = NAV_ITEMS.find(section => section.id === 'settings');
            const subtitlesItem = settingsSection?.items.find(item => item.path === '/settings/subtitles');
            expect(subtitlesItem).toBeDefined();
            expect(subtitlesItem?.label).toBe('Subtitles');
            expect(subtitlesItem?.icon).toBe('Languages');
        });
    });
});
//# sourceMappingURL=navigation.test.js.map