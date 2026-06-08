import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TablePager } from './TablePager';

describe('TablePager', () => {
  it('renders navigation controls and page-size selector', () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    const onPageSizeChange = vi.fn();

    render(
      <TablePager
        page={2}
        totalPages={4}
        pageSize={25}
        pageSizeOptions={[10, 25, 50]}
        onPrev={onPrev}
        onNext={onNext}
        onPageSizeChange={onPageSizeChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /previous page/i }));
    fireEvent.click(screen.getByRole('button', { name: /next page/i }));
    fireEvent.change(screen.getByLabelText('Page size'), { target: { value: '50' } });

    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });

  it('renders the page info copy (e.g., "Page 1 of 3")', () => {
    render(
      <TablePager
        page={1}
        totalPages={3}
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />,
    );

    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
  });

  it('disables Previous on the first page', () => {
    render(
      <TablePager
        page={1}
        totalPages={3}
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /previous page/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /next page/i })).not.toBeDisabled();
  });

  it('disables Next on the last page', () => {
    render(
      <TablePager
        page={3}
        totalPages={3}
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /next page/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /previous page/i })).not.toBeDisabled();
  });
});
