import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { applyHoverReorder, reorderOnHover, TableOptionsModal } from './TableOptionsModal';

describe('TableOptionsModal', () => {
  it('toggles visibility and reorders columns', () => {
    const onChange = vi.fn();
    const onClose = vi.fn();

    render(
      <TableOptionsModal
        title="Column options"
        columns={[
          { key: 'title', label: 'Title', visible: true },
          { key: 'year', label: 'Year', visible: true },
          { key: 'status', label: 'Status', visible: true },
        ]}
        onChange={onChange}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByLabelText('Toggle Year'));
    expect(onChange).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /move year up/i }));
    fireEvent.click(screen.getByRole('button', { name: /move year down/i }));
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('returns unchanged columns when hover indexes are equal', () => {
    const columns = [
      { key: 'title', label: 'Title', visible: true },
      { key: 'year', label: 'Year', visible: true },
    ];

    expect(reorderOnHover(columns, 0, 0)).toBe(columns);
    expect(reorderOnHover(columns, 0, 1).map(column => column.key)).toEqual(['year', 'title']);
  });

  it('applies hover reorder updates only when indexes differ', () => {
    const onChange = vi.fn();
    const columns = [
      { key: 'title', label: 'Title', visible: true },
      { key: 'year', label: 'Year', visible: true },
    ];
    const item = { index: 0 };

    applyHoverReorder(columns, item, 0, onChange);
    expect(onChange).not.toHaveBeenCalled();
    expect(item.index).toBe(0);

    applyHoverReorder(columns, item, 1, onChange);
    expect(onChange).toHaveBeenCalledWith([
      { key: 'year', label: 'Year', visible: true },
      { key: 'title', label: 'Title', visible: true },
    ]);
    expect(item.index).toBe(1);
  });
});
