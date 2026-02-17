import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Switch } from './Switch';

describe('Switch', () => {
  it('renders unchecked switch correctly', () => {
    render(
      <Switch
        checked={false}
        onChange={() => {}}
        aria-label="Enable feature"
      />,
    );

    const checkbox = screen.getByRole('checkbox', { name: 'Enable feature' });
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
  });

  it('renders checked switch correctly', () => {
    render(
      <Switch
        checked
        onChange={() => {}}
        aria-label="Enable feature"
      />,
    );

    const checkbox = screen.getByRole('checkbox', { name: 'Enable feature' });
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toBeChecked();
  });

  it('calls onChange when clicked', () => {
    const handleChange = vi.fn();
    render(
      <Switch
        checked={false}
        onChange={handleChange}
        aria-label="Enable feature"
      />,
    );

    const checkbox = screen.getByRole('checkbox', { name: 'Enable feature' });
    checkbox.click();
    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('renders with label text', () => {
    render(
      <Switch
        checked
        onChange={() => {}}
        label="Enable notifications"
      />,
    );

    expect(screen.getByText('Enable notifications')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Enable notifications' })).toBeInTheDocument();
  });

  it('disables switch when disabled prop is true', () => {
    render(
      <Switch
        checked
        onChange={() => {}}
        disabled
        aria-label="Enable feature"
      />,
    );

    const checkbox = screen.getByRole('checkbox', { name: 'Enable feature' });
    expect(checkbox).toBeDisabled();
  });

  it('prefers aria-label over label for accessibility', () => {
    render(
      <Switch
        checked
        onChange={() => {}}
        label="Enable feature"
        aria-label="Custom label"
      />,
    );

    const checkbox = screen.getByRole('checkbox', { name: 'Custom label' });
    expect(checkbox).toBeInTheDocument();
  });
});
