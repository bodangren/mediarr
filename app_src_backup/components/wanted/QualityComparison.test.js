import { jsx as _jsx } from "react/jsx-runtime";
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QualityComparison } from './QualityComparison';
describe('QualityComparison', () => {
    it('renders current and cutoff quality with arrow', () => {
        render(_jsx(QualityComparison, { current: "720p", cutoff: "1080p" }));
        expect(screen.getByText('720p')).toBeInTheDocument();
        expect(screen.getByText('1080p')).toBeInTheDocument();
        // Arrow icon should be present in the document (hidden from accessibility but in DOM)
        const { container } = render(_jsx(QualityComparison, { current: "720p", cutoff: "1080p" }));
        expect(container.querySelector('svg')).toBeInTheDocument();
    });
    it('renders with custom className', () => {
        const { container } = render(_jsx(QualityComparison, { current: "Bluray-720p", cutoff: "Bluray-1080p", className: "text-red-500" }));
        const wrapper = container.querySelector('.text-red-500');
        expect(wrapper).toBeInTheDocument();
    });
    it('renders complex quality strings', () => {
        render(_jsx(QualityComparison, { current: "WEB-DL-1080p", cutoff: "Bluray-2160p" }));
        expect(screen.getByText('WEB-DL-1080p')).toBeInTheDocument();
        expect(screen.getByText('Bluray-2160p')).toBeInTheDocument();
    });
});
//# sourceMappingURL=QualityComparison.test.js.map