import { jsx as _jsx } from "react/jsx-runtime";
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TablePager } from './TablePager';
describe('TablePager', () => {
    it('renders navigation controls and page-size selector', () => {
        const onPrev = vi.fn();
        const onNext = vi.fn();
        const onPageSizeChange = vi.fn();
        render(_jsx(TablePager, { page: 2, totalPages: 4, pageSize: 25, pageSizeOptions: [10, 25, 50], onPrev: onPrev, onNext: onNext, onPageSizeChange: onPageSizeChange }));
        fireEvent.click(screen.getByRole('button', { name: /previous page/i }));
        fireEvent.click(screen.getByRole('button', { name: /next page/i }));
        fireEvent.change(screen.getByLabelText('Page size'), { target: { value: '50' } });
        expect(onPrev).toHaveBeenCalledTimes(1);
        expect(onNext).toHaveBeenCalledTimes(1);
        expect(onPageSizeChange).toHaveBeenCalledWith(50);
    });
});
//# sourceMappingURL=table-pager.test.js.map