import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, cleanup } from '@testing-library/react';
import { describe, expect, it, afterEach } from 'vitest';
import { ProviderStatusBadge } from './ProviderStatusBadge';
describe('ProviderStatusBadge', () => {
    afterEach(() => {
        cleanup();
    });
    const mockProvider = {
        id: '1',
        name: 'OpenSubtitles',
        enabled: true,
        type: 'opensubtitles',
        settings: {},
        status: 'active',
    };
    it('renders active status for enabled provider', () => {
        render(_jsx(ProviderStatusBadge, { provider: mockProvider, status: "active" }));
        expect(screen.getByText('completed')).toBeInTheDocument();
    });
    it('renders disabled status for disabled provider', () => {
        render(_jsx(ProviderStatusBadge, { provider: { ...mockProvider, enabled: false, status: 'disabled' }, status: "disabled" }));
        expect(screen.getByText('disabled')).toBeInTheDocument();
    });
    it('renders error status for provider with error', () => {
        render(_jsx(ProviderStatusBadge, { provider: { ...mockProvider, status: 'error' }, status: "error" }));
        expect(screen.getByText('error')).toBeInTheDocument();
    });
    it('displays last error message when status is error', () => {
        const errorMessage = 'Authentication failed';
        render(_jsx(ProviderStatusBadge, { provider: { ...mockProvider, lastError: errorMessage, status: 'error' }, status: "error" }));
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
    // Note: This test is skipped due to complexities with text matching across multiple test runs
    // The functionality is covered by other tests that verify error status rendering
    it('does not display error when status is not error', () => {
        render(_jsx(ProviderStatusBadge, { provider: { ...mockProvider, lastError: 'Some error', status: 'active' }, status: "active" }));
        expect(screen.queryByText('Some error')).not.toBeInTheDocument();
    });
    it('does not display error when status is not error', () => {
        render(_jsx(ProviderStatusBadge, { provider: { ...mockProvider, lastError: 'Some error', status: 'active' }, status: "active" }));
        expect(screen.queryByText('Some error')).not.toBeInTheDocument();
    });
    it('shows correct status based on provider enabled state', () => {
        const { rerender } = render(_jsx(ProviderStatusBadge, { provider: mockProvider, status: "active" }));
        // When enabled and no error
        expect(screen.getByText('completed')).toBeInTheDocument();
        // When disabled
        rerender(_jsx(ProviderStatusBadge, { provider: { ...mockProvider, enabled: false, status: 'disabled' }, status: "disabled" }));
        expect(screen.getByText('disabled')).toBeInTheDocument();
        // When error
        rerender(_jsx(ProviderStatusBadge, { provider: { ...mockProvider, status: 'error' }, status: "error" }));
        expect(screen.getByText('error')).toBeInTheDocument();
    });
});
//# sourceMappingURL=ProviderStatusBadge.test.js.map