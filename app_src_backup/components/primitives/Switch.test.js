import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Switch } from './Switch';
describe('Switch', () => {
    it('renders unchecked switch correctly', () => {
        render(_jsx(Switch, { checked: false, onChange: () => { }, "aria-label": "Enable feature" }));
        const checkbox = screen.getByRole('checkbox', { name: 'Enable feature' });
        expect(checkbox).toBeInTheDocument();
        expect(checkbox).not.toBeChecked();
    });
    it('renders checked switch correctly', () => {
        render(_jsx(Switch, { checked: true, onChange: () => { }, "aria-label": "Enable feature" }));
        const checkbox = screen.getByRole('checkbox', { name: 'Enable feature' });
        expect(checkbox).toBeInTheDocument();
        expect(checkbox).toBeChecked();
    });
    it('calls onChange when clicked', () => {
        const handleChange = vi.fn();
        render(_jsx(Switch, { checked: false, onChange: handleChange, "aria-label": "Enable feature" }));
        const checkbox = screen.getByRole('checkbox', { name: 'Enable feature' });
        checkbox.click();
        expect(handleChange).toHaveBeenCalledTimes(1);
        expect(handleChange).toHaveBeenCalledWith(true);
    });
    it('renders with label text', () => {
        render(_jsx(Switch, { checked: true, onChange: () => { }, label: "Enable notifications" }));
        expect(screen.getByText('Enable notifications')).toBeInTheDocument();
        expect(screen.getByRole('checkbox', { name: 'Enable notifications' })).toBeInTheDocument();
    });
    it('disables switch when disabled prop is true', () => {
        render(_jsx(Switch, { checked: true, onChange: () => { }, disabled: true, "aria-label": "Enable feature" }));
        const checkbox = screen.getByRole('checkbox', { name: 'Enable feature' });
        expect(checkbox).toBeDisabled();
    });
    it('prefers aria-label over label for accessibility', () => {
        render(_jsx(Switch, { checked: true, onChange: () => { }, label: "Enable feature", "aria-label": "Custom label" }));
        const checkbox = screen.getByRole('checkbox', { name: 'Custom label' });
        expect(checkbox).toBeInTheDocument();
    });
});
//# sourceMappingURL=Switch.test.js.map