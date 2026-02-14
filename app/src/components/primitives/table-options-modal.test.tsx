import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TableOptionsModal } from './TableOptionsModal';

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
});
