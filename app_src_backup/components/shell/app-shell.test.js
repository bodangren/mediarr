import { jsx as _jsx } from "react/jsx-runtime";
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppShell } from './AppShell';
function renderShell(pathname = '/library/series') {
    return render(_jsx(AppShell, { pathname: pathname, children: _jsx("div", { children: "Page content" }) }));
}
describe('app shell', () => {
    it('highlights active route and renders breadcrumbs', () => {
        renderShell('/library/series/42');
        const seriesLinks = screen.getAllByRole('link', { name: /series/i });
        expect(seriesLinks.some(link => link.getAttribute('aria-current') === 'page')).toBe(true);
        expect(screen.getByText('Library')).toBeInTheDocument();
        expect(screen.getAllByText('Series').length).toBeGreaterThan(0);
    });
    it('opens and closes command palette with ctrl/cmd+k', () => {
        renderShell('/');
        fireEvent.keyDown(window, { key: 'k', metaKey: true });
        expect(screen.getByRole('dialog', { name: /command palette/i })).toBeInTheDocument();
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(screen.queryByRole('dialog', { name: /command palette/i })).not.toBeInTheDocument();
    });
    it('shows realtime connection status indicator', () => {
        renderShell('/');
        expect(screen.getByRole('status')).toHaveTextContent('Realtime: Idle');
    });
    it('opens keyboard shortcuts help with question mark', () => {
        renderShell('/');
        fireEvent.keyDown(window, { key: '?' });
        expect(screen.getByRole('dialog', { name: /keyboard shortcuts/i })).toBeInTheDocument();
    });
    it('renders mobile bottom nav with active state', () => {
        renderShell('/wanted');
        const wantedLinks = screen.getAllByRole('link', { name: /^wanted$/i });
        expect(wantedLinks.some(link => link.getAttribute('aria-current') === 'page')).toBe(true);
    });
    it('supports collapsing and expanding the desktop sidebar', () => {
        renderShell('/library/series');
        const collapseButton = screen.getByRole('button', { name: /collapse sidebar/i });
        fireEvent.click(collapseButton);
        expect(screen.getByRole('button', { name: /expand sidebar/i })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /expand sidebar/i }));
        expect(screen.getByRole('button', { name: /collapse sidebar/i })).toBeInTheDocument();
    });
});
//# sourceMappingURL=app-shell.test.js.map