import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FilterMenu } from './FilterMenu';

describe('FilterMenu', () => {
  it('renders filter options and emits selected key', () => {
    const onChange = vi.fn();
    render(
      <FilterMenu
        label="Protocol"
        value="all"
        options={[
          { key: 'all', label: 'All' },
          { key: 'torrent', label: 'Torrent' },
          { key: 'usenet', label: 'Usenet' },
        ]}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText('Protocol'), { target: { value: 'torrent' } });
    expect(onChange).toHaveBeenCalledWith('torrent');
  });
});
