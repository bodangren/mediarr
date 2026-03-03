import { jsx as _jsx } from "react/jsx-runtime";
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppShell } from '@/components/shell/AppShell';
import { UI_PREFERENCES_STORAGE_KEY } from '@/lib/uiPreferences';
import UiSettingsPage from './page';
function renderPage() {
    return render(_jsx(AppShell, { pathname: "/settings/ui", children: _jsx(UiSettingsPage, {}) }));
}
describe('settings ui page', () => {
    beforeEach(() => {
        window.localStorage.clear();
        delete document.documentElement.dataset.theme;
        delete document.documentElement.dataset.colorImpaired;
    });
    it('renders UI preference controls', () => {
        renderPage();
        expect(screen.getByRole('heading', { name: 'UI Settings' })).toBeInTheDocument();
        expect(screen.getByLabelText('Theme')).toBeInTheDocument();
        expect(screen.getByLabelText('Date Format')).toBeInTheDocument();
        expect(screen.getByLabelText('Time Format')).toBeInTheDocument();
        expect(screen.getByRole('checkbox', { name: /Enable accessibility-friendly status colors/i })).toBeInTheDocument();
    });
    it('hydrates saved preferences from local storage', () => {
        window.localStorage.setItem(UI_PREFERENCES_STORAGE_KEY, JSON.stringify({
            theme: 'light',
            dateFormat: 'long',
            timeFormat: '12h',
            showRelativeDates: false,
            colorImpairedMode: true,
        }));
        renderPage();
        expect(screen.getByLabelText('Theme')).toHaveValue('light');
        expect(screen.getByLabelText('Date Format')).toHaveValue('long');
        expect(screen.getByLabelText('Time Format')).toHaveValue('12h');
        expect(screen.getByLabelText('Show relative dates where available')).not.toBeChecked();
        expect(screen.getByRole('checkbox', { name: /Enable accessibility-friendly status colors/i })).toBeChecked();
    });
    it('persists preferences and applies theme attributes', () => {
        renderPage();
        fireEvent.change(screen.getByLabelText('Theme'), { target: { value: 'light' } });
        fireEvent.click(screen.getByRole('checkbox', { name: /Enable accessibility-friendly status colors/i }));
        fireEvent.click(screen.getByRole('button', { name: 'Save UI Settings' }));
        const stored = window.localStorage.getItem(UI_PREFERENCES_STORAGE_KEY);
        expect(stored).toContain('"theme":"light"');
        expect(stored).toContain('"colorImpairedMode":true');
        expect(document.documentElement.dataset.theme).toBe('light');
        expect(document.documentElement.dataset.colorImpaired).toBe('true');
        expect(screen.getByText('Saved.')).toBeInTheDocument();
    });
    it('saves preferences with cmd/ctrl+s shortcut', () => {
        renderPage();
        fireEvent.change(screen.getByLabelText('Theme'), { target: { value: 'light' } });
        fireEvent.keyDown(window, { key: 's', metaKey: true });
        const stored = window.localStorage.getItem(UI_PREFERENCES_STORAGE_KEY);
        expect(stored).toContain('"theme":"light"');
        expect(document.documentElement.dataset.theme).toBe('light');
        expect(screen.getByText('Saved.')).toBeInTheDocument();
    });
});
//# sourceMappingURL=page.test.js.map