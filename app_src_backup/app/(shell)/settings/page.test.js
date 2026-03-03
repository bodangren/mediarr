import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SettingsPage from './page';
vi.mock('./settings-form', () => ({
    SettingsForm: () => _jsx("div", { "data-testid": "settings-form", children: "Settings Form" }),
}));
describe('settings page', () => {
    it('renders settings header and form surface', () => {
        render(_jsx(SettingsPage, {}));
        expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Indexers' })).toHaveAttribute('href', '/settings/indexers');
        expect(screen.getByTestId('settings-form')).toBeInTheDocument();
    });
});
//# sourceMappingURL=page.test.js.map