import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ColumnPicker } from './ColumnPicker';

describe('ColumnPicker', () => {
  it('toggles visible table columns', () => {
    const onChange = vi.fn();

    render(
      <ColumnPicker
        options={[
          { key: 'title', label: 'Title' },
          { key: 'network', label: 'Network' },
          { key: 'status', label: 'Status' },
        ]}
        visibleColumns={['title', 'status']}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Columns' }));
    fireEvent.click(screen.getByLabelText('Network'));

    expect(onChange).toHaveBeenCalledWith(['title', 'status', 'network']);
  });
});
