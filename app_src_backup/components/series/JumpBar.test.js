import { jsx as _jsx } from "react/jsx-runtime";
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { JumpBar } from './JumpBar';
describe('JumpBar', () => {
    it('renders jump options and selects a letter', () => {
        const onChange = vi.fn();
        render(_jsx(JumpBar, { value: "All", onChange: onChange }));
        expect(screen.getByRole('button', { name: 'A' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '#' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
        fireEvent.click(screen.getByRole('button', { name: 'M' }));
        expect(onChange).toHaveBeenCalledWith('M');
    });
});
//# sourceMappingURL=JumpBar.test.js.map