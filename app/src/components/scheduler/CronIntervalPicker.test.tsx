import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CronIntervalPicker } from './CronIntervalPicker';

describe('CronIntervalPicker', () => {
  it('renders the standard preset buttons (15m, 30m, 1h, 6h, 12h, 24h)', () => {
    render(<CronIntervalPicker value="*/15 * * * *" onChange={() => {}} />);

    expect(screen.getByRole('button', { name: /^15m$/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^30m$/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^1h$/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^6h$/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^12h$/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^24h$/ })).toBeInTheDocument();
  });

  it('marks the active preset button based on the current value', () => {
    render(<CronIntervalPicker value="*/30 * * * *" onChange={() => {}} />);

    const active = screen.getByRole('button', { name: /^30m$/ });
    expect(active).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^15m$/ })).toHaveAttribute('aria-pressed', 'false');
  });

  it('clicking a preset calls onChange with the matching cron expression', () => {
    const onChange = vi.fn();
    render(<CronIntervalPicker value="*/15 * * * *" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: /^1h$/ }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('0 * * * *');
  });

  it('clicking the "30m" preset emits "*/30 * * * *"', () => {
    const onChange = vi.fn();
    render(<CronIntervalPicker value="*/15 * * * *" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: /^30m$/ }));

    expect(onChange).toHaveBeenCalledWith('*/30 * * * *');
  });

  it('renders a custom cron text input pre-filled with the current value', () => {
    render(<CronIntervalPicker value="*/15 * * * *" onChange={() => {}} />);

    const input = screen.getByLabelText(/custom cron expression/i) as HTMLInputElement;
    expect(input.value).toBe('*/15 * * * *');
  });

  it('accepts a valid 5-field cron expression typed in the custom input', () => {
    const onChange = vi.fn();
    render(<CronIntervalPicker value="*/15 * * * *" onChange={onChange} />);

    const input = screen.getByLabelText(/custom cron expression/i);
    fireEvent.change(input, { target: { value: '0 */2 * * *' } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith('0 */2 * * *');
  });

  it('rejects an invalid cron expression typed in the custom input and does not call onChange', () => {
    const onChange = vi.fn();
    render(<CronIntervalPicker value="*/15 * * * *" onChange={onChange} />);

    const input = screen.getByLabelText(/custom cron expression/i);
    fireEvent.change(input, { target: { value: '99 99' } });
    fireEvent.blur(input);

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(/invalid cron expression/i)).toBeInTheDocument();
  });

  it('clears the validation error once a valid expression is entered', () => {
    const onChange = vi.fn();
    render(<CronIntervalPicker value="*/15 * * * *" onChange={onChange} />);

    const input = screen.getByLabelText(/custom cron expression/i);

    fireEvent.change(input, { target: { value: 'not-a-cron' } });
    fireEvent.blur(input);
    expect(screen.getByText(/invalid cron expression/i)).toBeInTheDocument();

    fireEvent.change(input, { target: { value: '*/5 * * * *' } });
    fireEvent.blur(input);

    expect(screen.queryByText(/invalid cron expression/i)).not.toBeInTheDocument();
    expect(onChange).toHaveBeenCalledWith('*/5 * * * *');
  });

  it('disables all preset buttons and the input when disabled prop is set', () => {
    render(<CronIntervalPicker value="*/15 * * * *" onChange={() => {}} disabled />);

    expect(screen.getByRole('button', { name: /^15m$/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^24h$/ })).toBeDisabled();
    expect(screen.getByLabelText(/custom cron expression/i)).toBeDisabled();
  });
});