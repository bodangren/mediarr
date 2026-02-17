import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SortMenu, type SortDirection } from './SortMenu';

describe('SortMenu', () => {
  const mockOnChange = vi.fn();
  const mockOnDirectionChange = vi.fn();

  const defaultOptions = [
    { key: 'title', label: 'Title' },
    { key: 'date', label: 'Date Added' },
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

    expect(screen.getByLabelText(/sort by/i)).toHaveValue('title');
    expect(screen.getByLabelText(/toggle sort direction/i)).toBeInTheDocument();
  });

  it('renders with custom label', () => {
    render(
      <SortMenu
        options={defaultOptions}
        value="date"
        direction="desc"
        label="Order"
        onChange={mockOnChange}
        onDirectionChange={mockOnDirectionChange}
      />,
    );

    expect(screen.getByText('Order')).toBeInTheDocument();
  });

  it('displays up arrow icon for ascending direction', () => {
    render(
      <SortMenu
        options={defaultOptions}
        value="title"
        direction="asc"
        onChange={mockOnChange}
        onDirectionChange={mockOnDirectionChange}
      />,
    );

    const directionButton = screen.getByLabelText(/toggle sort direction \(asc\)/i);
    expect(directionButton).toBeInTheDocument();
    expect(directionButton.querySelector('svg')).toBeInTheDocument();
  });

  it('displays down arrow icon for descending direction', () => {
    render(
      <SortMenu
        options={defaultOptions}
        value="title"
        direction="desc"
        onChange={mockOnChange}
        onDirectionChange={mockOnDirectionChange}
      />,
    );

    const directionButton = screen.getByLabelText(/toggle sort direction \(desc\)/i);
    expect(directionButton).toBeInTheDocument();
    expect(directionButton.querySelector('svg')).toBeInTheDocument();
  });

  it('calls onChange when select value changes', async () => {
    render(
      <SortMenu
        options={defaultOptions}
        value="title"
        direction="asc"
        onChange={mockOnChange}
        onDirectionChange={mockOnDirectionChange}
      />,
    );

    const select = screen.getByLabelText(/sort by/i);
    await userEvent.selectOptions(select, 'date');

    expect(mockOnChange).toHaveBeenCalledWith('date');
    expect(mockOnChange).toHaveBeenCalledTimes(1);
    expect(mockOnDirectionChange).not.toHaveBeenCalled();
  });

  it('calls onDirectionChange when direction button is clicked', async () => {
    render(
      <SortMenu
        options={defaultOptions}
        value="title"
        direction="asc"
        onChange={mockOnChange}
        onDirectionChange={mockOnDirectionChange}
      />,
    );

    const directionButton = screen.getByLabelText(/toggle sort direction/i);
    await userEvent.click(directionButton);

    expect(mockOnDirectionChange).toHaveBeenCalledWith('desc');
    expect(mockOnDirectionChange).toHaveBeenCalledTimes(1);
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('toggles direction from asc to desc', async () => {
    render(
      <SortMenu
        options={defaultOptions}
        value="title"
        direction="asc"
        onChange={mockOnChange}
        onDirectionChange={mockOnDirectionChange}
      />,
    );

    const directionButton = screen.getByLabelText(/toggle sort direction/i);
    await userEvent.click(directionButton);

    expect(mockOnDirectionChange).toHaveBeenCalledWith('desc');
  });

  it('toggles direction from desc to asc', async () => {
    render(
      <SortMenu
        options={defaultOptions}
        value="title"
        direction="desc"
        onChange={mockOnChange}
        onDirectionChange={mockOnDirectionChange}
      />,
    );

    const directionButton = screen.getByLabelText(/toggle sort direction/i);
    await userEvent.click(directionButton);

    expect(mockOnDirectionChange).toHaveBeenCalledWith('asc');
  });

  it('renders all options in select dropdown', () => {
    render(
      <SortMenu
        options={defaultOptions}
        value="title"
        direction="asc"
        onChange={mockOnChange}
        onDirectionChange={mockOnDirectionChange}
      />,
    );

    const select = screen.getByLabelText(/sort by/i);
    const options = select.querySelectorAll('option');

    expect(options).toHaveLength(3);
    expect(options[0]).toHaveValue('title');
    expect(options[0]).toHaveTextContent('Title');
    expect(options[1]).toHaveValue('date');
    expect(options[1]).toHaveTextContent('Date Added');
    expect(options[2]).toHaveValue('size');
    expect(options[2]).toHaveTextContent('Size');
  });

  it('applies correct styling to select and button', () => {
    render(
      <SortMenu
        options={defaultOptions}
        value="title"
        direction="asc"
        onChange={mockOnChange}
        onDirectionChange={mockOnDirectionChange}
      />,
    );

    const select = screen.getByLabelText(/sort by/i);
    expect(select).toHaveClass('rounded-sm', 'rounded-r-none', 'border', 'border-border-subtle', 'bg-surface-1');

    const directionButton = screen.getByLabelText(/toggle sort direction/i);
    expect(directionButton).toHaveClass('rounded-sm', 'rounded-l-none', 'border', 'border-l-0', 'border-border-subtle');
  });

  it('direction button has accent color', () => {
    render(
      <SortMenu
        options={defaultOptions}
        value="title"
        direction="asc"
        onChange={mockOnChange}
        onDirectionChange={mockOnDirectionChange}
      />,
    );

    const directionButton = screen.getByLabelText(/toggle sort direction/i);
    expect(directionButton).toHaveClass('text-accent-primary', 'hover:bg-surface-2');
  });

  it('handles multiple direction toggles', async () => {
    const { rerender } = render(
      <SortMenu
        options={defaultOptions}
        value="title"
        direction="asc"
        onChange={mockOnChange}
        onDirectionChange={mockOnDirectionChange}
      />,
    );

    const directionButton = screen.getByLabelText(/toggle sort direction/i);

    // First click: asc -> desc
    await userEvent.click(directionButton);
    expect(mockOnDirectionChange).toHaveBeenLastCalledWith('desc');

    // Rerender with new direction
    rerender(
      <SortMenu
        options={defaultOptions}
        value="title"
        direction="desc"
        onChange={mockOnChange}
        onDirectionChange={mockOnDirectionChange}
      />,
    );

    // Second click: desc -> asc
    await userEvent.click(directionButton);
    expect(mockOnDirectionChange).toHaveBeenLastCalledWith('asc');

    // Rerender with new direction
    rerender(
      <SortMenu
        options={defaultOptions}
        value="title"
        direction="asc"
        onChange={mockOnChange}
        onDirectionChange={mockOnDirectionChange}
      />,
    );

    // Third click: asc -> desc
    await userEvent.click(directionButton);
    expect(mockOnDirectionChange).toHaveBeenLastCalledWith('desc');

    expect(mockOnDirectionChange).toHaveBeenCalledTimes(3);
  });

  it('handles multiple value changes', async () => {
    render(
      <SortMenu
        options={defaultOptions}
        value="title"
        direction="asc"
        onChange={mockOnChange}
        onDirectionChange={mockOnDirectionChange}
      />,
    );

    const select = screen.getByLabelText(/sort by/i);

    await userEvent.selectOptions(select, 'date');
    expect(mockOnChange).toHaveBeenLastCalledWith('date');

    await userEvent.selectOptions(select, 'size');
    expect(mockOnChange).toHaveBeenLastCalledWith('size');

    await userEvent.selectOptions(select, 'title');
    expect(mockOnChange).toHaveBeenLastCalledWith('title');

    expect(mockOnChange).toHaveBeenCalledTimes(3);
  });

  it('works independently for onChange and onDirectionChange', async () => {
    render(
      <SortMenu
        options={defaultOptions}
        value="title"
        direction="asc"
        onChange={mockOnChange}
        onDirectionChange={mockOnDirectionChange}
      />,
    );

    const select = screen.getByLabelText(/sort by/i);
    const directionButton = screen.getByLabelText(/toggle sort direction/i);

    await userEvent.selectOptions(select, 'date');
    await userEvent.click(directionButton);

    expect(mockOnChange).toHaveBeenCalledWith('date');
    expect(mockOnDirectionChange).toHaveBeenCalledWith('desc');
  });

  describe('direction types', () => {
    it.each<SortDirection>(['asc', 'desc'])('renders correctly with %s direction', direction => {
      render(
        <SortMenu
          options={defaultOptions}
          value="title"
          direction={direction}
          onChange={mockOnChange}
          onDirectionChange={mockOnDirectionChange}
        />,
      );

      const directionButton = screen.getByLabelText(new RegExp(`toggle sort direction \\(${direction}\\)`, 'i'));
      expect(directionButton).toBeInTheDocument();
    });
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

    const select = screen.getByLabelText(/sort by/i);
    expect(select).toBeInTheDocument();
    expect(select).toHaveAccessibleName(/sort by/i);

    const directionButton = screen.getByLabelText(/toggle sort direction/i);
    expect(directionButton).toBeInTheDocument();
    expect(directionButton).toHaveAccessibleName(/toggle sort direction \(asc\)/i);
  });
});
