import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SeriesTypePopover, type SeriesType, SERIES_TYPE_OPTIONS } from './SeriesTypePopover';

describe('SeriesTypePopover', () => {
  it('renders with default selected option', () => {
    const onChange = vi.fn();
    render(<SeriesTypePopover value="standard" onChange={onChange} />);

    expect(screen.getByText('Standard')).toBeInTheDocument();
  });

  it('displays the correct label for each series type', () => {
    const onChange = vi.fn();
    render(<SeriesTypePopover value="anime" onChange={onChange} />);

    expect(screen.getByText('Anime')).toBeInTheDocument();
  });

  it('opens popover when button is clicked', () => {
    const onChange = vi.fn();
    render(<SeriesTypePopover value="standard" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: /standard/i }));

    expect(screen.getByRole('listbox', { name: /series type options/i })).toBeInTheDocument();
  });

  it('displays all series types when open', () => {
    const onChange = vi.fn();
    render(<SeriesTypePopover value="standard" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: /standard/i }));

    SERIES_TYPE_OPTIONS.forEach(option => {
      // Use getAllByText since the button also contains the text
      const labels = screen.getAllByText(option.label);
      expect(labels.length).toBeGreaterThan(0);
      expect(screen.getByText(option.description)).toBeInTheDocument();
    });
  });

  it('calls onChange when an option is selected', () => {
    const onChange = vi.fn();
    render(<SeriesTypePopover value="standard" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: /standard/i }));
    fireEvent.click(screen.getByRole('option', { name: /anime/i }));

    expect(onChange).toHaveBeenCalledWith('anime');
  });

  it('closes popover after selecting an option', () => {
    const onChange = vi.fn();
    render(<SeriesTypePopover value="standard" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: /standard/i }));
    fireEvent.click(screen.getByRole('option', { name: /daily/i }));

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes popover when clicking outside', () => {
    const onChange = vi.fn();
    render(
      <div>
        <SeriesTypePopover value="standard" onChange={onChange} />
        <div data-testid="outside">Outside</div>
      </div>,
    );

    fireEvent.click(screen.getByRole('button', { name: /standard/i }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes popover when pressing Escape', () => {
    const onChange = vi.fn();
    render(<SeriesTypePopover value="standard" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: /standard/i }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('disables button when disabled prop is true', () => {
    const onChange = vi.fn();
    render(<SeriesTypePopover value="standard" onChange={onChange} disabled />);

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('does not open popover when disabled', () => {
    const onChange = vi.fn();
    render(<SeriesTypePopover value="standard" onChange={onChange} disabled />);

    fireEvent.click(screen.getByRole('button', { name: /standard/i }));

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('shows aria-selected for the selected option', () => {
    const onChange = vi.fn();
    render(<SeriesTypePopover value="daily" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: /daily/i }));

    const selectedOption = screen.getByRole('option', { name: /daily/i, selected: true });
    expect(selectedOption).toBeInTheDocument();
  });

  it.each<SeriesType>(['standard', 'anime', 'daily'])('displays correct label for %s option', option => {
    const onChange = vi.fn();
    const config = SERIES_TYPE_OPTIONS.find(o => o.value === option);
    render(<SeriesTypePopover value={option} onChange={onChange} />);

    expect(screen.getByText(config!.label)).toBeInTheDocument();
  });
});
