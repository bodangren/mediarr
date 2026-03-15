import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SortMenu } from './sort-menu-compat';

describe('SortMenu', () => {
  const mockOnChange = vi.fn();
  const mockOnDirectionChange = vi.fn();

  const defaultOptions = [
    { key: 'title', label: 'Title' },
    { key: 'date', label: 'Date' },
    { key: 'size', label: 'Size' },
  ];

  beforeEach(() => {
    mockOnChange.mockClear();
    mockOnDirectionChange.mockClear();
  });

  it('renders correctly with initial values', () => {
    render(
      <SortMenu
        options={defaultOptions}
        value="title"
        direction="asc"
        onChange={mockOnChange}
        onDirectionChange={mockOnDirectionChange}
      />,
    );

    expect(screen.getByText('Sort')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sort by/i })).toHaveTextContent('Title');
    expect(screen.getByRole('button', { name: /toggle sort direction/i })).toBeInTheDocument();
  });

  it('displays correct arrow icon for direction', () => {
    const { rerender } = render(
      <SortMenu
        options={defaultOptions}
        value="title"
        direction="asc"
        onChange={mockOnChange}
        onDirectionChange={mockOnDirectionChange}
      />,
    );

    // Lucide ArrowUp has data-lucide="arrow-up" or we can check via aria-label
    expect(screen.getByLabelText(/toggle sort direction \(asc\)/i)).toBeInTheDocument();

    rerender(
      <SortMenu
        options={defaultOptions}
        value="title"
        direction="desc"
        onChange={mockOnChange}
        onDirectionChange={mockOnDirectionChange}
      />,
    );

    expect(screen.getByLabelText(/toggle sort direction \(desc\)/i)).toBeInTheDocument();
  });

  it('calls onChange when option is selected', async () => {
    const user = userEvent.setup();
    render(
      <SortMenu
        options={defaultOptions}
        value="title"
        direction="asc"
        onChange={mockOnChange}
        onDirectionChange={mockOnDirectionChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: /sort by/i }));
    await user.click(screen.getByRole('menuitem', { name: 'Date' }));

    expect(mockOnChange).toHaveBeenCalledWith('date');
    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });

  it('calls onDirectionChange when direction button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <SortMenu
        options={defaultOptions}
        value="title"
        direction="asc"
        onChange={mockOnChange}
        onDirectionChange={mockOnDirectionChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: /toggle sort direction/i }));

    expect(mockOnDirectionChange).toHaveBeenCalledWith('desc');
    expect(mockOnDirectionChange).toHaveBeenCalledTimes(1);
  });

  it('has proper accessibility attributes', () => {
    render(
      <SortMenu
        options={defaultOptions}
        value="title"
        direction="asc"
        onChange={mockOnChange}
        onDirectionChange={mockOnDirectionChange}
      />,
    );

    expect(screen.getByRole('button', { name: /sort by/i })).toHaveAttribute('aria-haspopup', 'menu');
  });
});
