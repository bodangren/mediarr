import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Alert } from './Alert';
import { Button } from './Button';
import { Icon } from './Icon';
import { Label } from './Label';
describe('core primitives', () => {
    it('renders button variants and click interactions', () => {
        const onClick = vi.fn();
        render(_jsxs(_Fragment, { children: [_jsx(Button, { variant: "primary", onClick: onClick, children: "Primary" }), _jsx(Button, { variant: "secondary", children: "Secondary" }), _jsx(Button, { variant: "danger", children: "Danger" })] }));
        fireEvent.click(screen.getByRole('button', { name: 'Primary' }));
        expect(onClick).toHaveBeenCalledTimes(1);
        expect(screen.getByRole('button', { name: 'Secondary' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Danger' })).toBeInTheDocument();
    });
    it('renders icon from lucide set with accessible label', () => {
        render(_jsx(Icon, { name: "search", label: "Search icon" }));
        expect(screen.getByLabelText('Search icon')).toBeInTheDocument();
    });
    it('renders alert variants with semantic tone classes', () => {
        const { rerender } = render(_jsx(Alert, { variant: "info", children: "Info message" }));
        expect(screen.getByText('Info message')).toBeInTheDocument();
        rerender(_jsx(Alert, { variant: "success", children: "Success message" }));
        expect(screen.getByText('Success message')).toBeInTheDocument();
        rerender(_jsx(Alert, { variant: "warning", children: "Warning message" }));
        expect(screen.getByText('Warning message')).toBeInTheDocument();
        rerender(_jsx(Alert, { variant: "danger", children: "Danger message" }));
        expect(screen.getByText('Danger message')).toBeInTheDocument();
    });
    it('renders label badge variants', () => {
        render(_jsxs(_Fragment, { children: [_jsx(Label, { tone: "info", children: "Info" }), _jsx(Label, { tone: "success", children: "Success" }), _jsx(Label, { tone: "warning", children: "Warning" }), _jsx(Label, { tone: "danger", children: "Danger" })] }));
        expect(screen.getByText('Info')).toBeInTheDocument();
        expect(screen.getByText('Success')).toBeInTheDocument();
        expect(screen.getByText('Warning')).toBeInTheDocument();
        expect(screen.getByText('Danger')).toBeInTheDocument();
    });
});
//# sourceMappingURL=core-primitives.test.js.map