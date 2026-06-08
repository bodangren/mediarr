import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MetricCard } from './MetricCard';

describe('MetricCard', () => {
  it('renders value and label', () => {
    render(<MetricCard label="Total Movies" value="42" />);

    expect(screen.getByText('Total Movies')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders "Stable" when no trend is provided', () => {
    render(<MetricCard label="Downloads" value="10" />);

    expect(screen.getByText('Stable')).toBeInTheDocument();
  });

  it('renders "Trending up" when trend is up', () => {
    render(<MetricCard label="Downloads" value="10" trend="up" />);

    expect(screen.getByText('Trending up')).toBeInTheDocument();
  });

  it('renders "Trending down" when trend is down', () => {
    render(<MetricCard label="Downloads" value="10" trend="down" />);

    expect(screen.getByText('Trending down')).toBeInTheDocument();
  });

  it('renders "Stable" when trend is flat', () => {
    render(<MetricCard label="Downloads" value="10" trend="flat" />);

    expect(screen.getByText('Stable')).toBeInTheDocument();
  });

  it('renders an action button when onAction is provided', async () => {
    const onAction = vi.fn();
    const user = userEvent.setup();
    render(<MetricCard label="Movies" value="42" onAction={onAction} />);

    const button = screen.getByRole('button', { name: 'Open Movies' });
    expect(button).toBeInTheDocument();

    await user.click(button);
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('does not render an action button when onAction is omitted', () => {
    render(<MetricCard label="Movies" value="42" />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
