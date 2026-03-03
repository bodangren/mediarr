import { jsx as _jsx } from "react/jsx-runtime";
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LanguageBadge } from './LanguageBadge';
describe('LanguageBadge', () => {
    it('renders language code correctly', () => {
        render(_jsx(LanguageBadge, { languageCode: "en", variant: "available" }));
        expect(screen.getByText('en')).toBeInTheDocument();
    });
    it('renders available variant with correct styling', () => {
        render(_jsx(LanguageBadge, { languageCode: "en", variant: "available" }));
        const badge = screen.getByText('en');
        expect(badge).toHaveClass('bg-accent-success/20', 'text-accent-success');
    });
    it('renders missing variant with correct styling', () => {
        render(_jsx(LanguageBadge, { languageCode: "fr", variant: "missing" }));
        const badge = screen.getByText('fr');
        expect(badge).toHaveClass('bg-surface-2', 'text-text-muted');
    });
    it('renders searching variant with correct styling', () => {
        render(_jsx(LanguageBadge, { languageCode: "de", variant: "searching" }));
        const badge = screen.getByText('de');
        expect(badge).toHaveClass('bg-accent-warning/20', 'text-accent-warning', 'animate-pulse');
    });
    it('shows forced indicator when isForced is true', () => {
        render(_jsx(LanguageBadge, { languageCode: "en", variant: "available", isForced: true }));
        expect(screen.getByText('(F)')).toBeInTheDocument();
    });
    it('shows HI indicator when isHi is true', () => {
        render(_jsx(LanguageBadge, { languageCode: "en", variant: "available", isHi: true }));
        expect(screen.getByText('(HI)')).toBeInTheDocument();
    });
    it('shows both forced and HI indicators when both are true', () => {
        render(_jsx(LanguageBadge, { languageCode: "en", variant: "available", isForced: true, isHi: true }));
        expect(screen.getByText('(F) (HI)')).toBeInTheDocument();
    });
    it('calls onClick when clicked', () => {
        const handleClick = vi.fn();
        render(_jsx(LanguageBadge, { languageCode: "en", variant: "missing", onClick: handleClick }));
        fireEvent.click(screen.getByText('en'));
        expect(handleClick).toHaveBeenCalledTimes(1);
    });
    it('does not call onClick when not provided', () => {
        render(_jsx(LanguageBadge, { languageCode: "en", variant: "available" }));
        const badge = screen.getByText('en');
        expect(badge).not.toHaveClass('cursor-pointer');
    });
    it('is keyboard accessible when onClick is provided', () => {
        const handleClick = vi.fn();
        render(_jsx(LanguageBadge, { languageCode: "en", variant: "missing", onClick: handleClick }));
        const badge = screen.getByText('en');
        expect(badge).toHaveAttribute('role', 'button');
        expect(badge).toHaveAttribute('tabIndex', '0');
        fireEvent.keyDown(badge, { key: 'Enter' });
        expect(handleClick).toHaveBeenCalledTimes(1);
    });
    it('has correct ARIA label', () => {
        render(_jsx(LanguageBadge, { languageCode: "en", variant: "available", isForced: true }));
        const badge = screen.getByText('en');
        expect(badge).toHaveAttribute('aria-label', 'Language: en (F)');
    });
    it('applies custom className', () => {
        render(_jsx(LanguageBadge, { languageCode: "en", variant: "available", className: "custom-class" }));
        const badge = screen.getByText('en');
        expect(badge).toHaveClass('custom-class');
    });
    it('forwards additional props', () => {
        render(_jsx(LanguageBadge, { languageCode: "en", variant: "available", "data-testid": "test-badge" }));
        expect(screen.getByTestId('test-badge')).toBeInTheDocument();
    });
    it('indicators have reduced opacity', () => {
        render(_jsx(LanguageBadge, { languageCode: "en", variant: "available", isForced: true }));
        const indicator = screen.getByText('(F)');
        expect(indicator).toHaveClass('text-[10px]', 'opacity-75');
    });
    it('handles all variant types', () => {
        const { rerender } = render(_jsx(LanguageBadge, { languageCode: "en", variant: "available" }));
        expect(screen.getByText('en')).toBeInTheDocument();
        rerender(_jsx(LanguageBadge, { languageCode: "en", variant: "missing" }));
        expect(screen.getByText('en')).toBeInTheDocument();
        rerender(_jsx(LanguageBadge, { languageCode: "en", variant: "searching" }));
        expect(screen.getByText('en')).toBeInTheDocument();
    });
});
//# sourceMappingURL=LanguageBadge.test.js.map