import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Switch } from './switch-compat';

describe('Switch', () => {
  it('renders unchecked switch correctly', () => {
    render(
      <Switch
        id="feature-switch"
        checked={false}
        onChange={() => {}}
        label="Enable feature"
      />,
    );

    const checkbox = screen.getByRole('switch', { name: 'Enable feature' });
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toHaveAttribute('data-state', 'unchecked');
  });

  it('renders checked switch correctly', () => {
    render(
      <Switch
        id="feature-switch"
        checked
        onChange={() => {}}
        label="Enable feature"
      />,
    );

    const checkbox = screen.getByRole('switch', { name: 'Enable feature' });
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toHaveAttribute('data-state', 'checked');
  });

  it('calls onChange when clicked', () => {
    const handleChange = vi.fn();
    render(
      <Switch
        id="feature-switch"
        checked={false}
        onChange={handleChange}
        label="Enable feature"
      />,
    );

    const checkbox = screen.getByRole('switch', { name: 'Enable feature' });
    checkbox.click();
    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('renders with label text', () => {
    render(
      <Switch
        id="feature-switch"
        checked
        onChange={() => {}}
        label="Enable notifications"
      />,
    );

    expect(screen.getByText('Enable notifications')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Enable notifications' })).toBeInTheDocument();
  });

  it('disables switch when disabled prop is true', () => {
    render(
      <Switch
        id="feature-switch"
        checked
        onChange={() => {}}
        disabled
        label="Enable feature"
      />,
    );

    const checkbox = screen.getByRole('switch', { name: 'Enable feature' });
    expect(checkbox).toBeDisabled();
  });
});
