import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SortMenu, type SortMenuOption } from './SortMenu';

describe('SortMenu', () => {
  it('renders options and emits selected key on change', () => {
    const onChange = vi.fn();
    const options: SortMenuOption[] = [
      { key: 'title', label: 'Title' },
      { key: 'year', label: 'Year' },
      { key: 'status', label: 'Status' },
    ];

    render(<SortMenu options={options} value="title" onChange={onChange} label="Sort by" />);

    fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'year' } });
    expect(onChange).toHaveBeenCalledWith('year');
  });
});
