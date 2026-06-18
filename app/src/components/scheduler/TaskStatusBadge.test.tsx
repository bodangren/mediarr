import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TaskStatusBadge } from './TaskStatusBadge';

describe('TaskStatusBadge', () => {
  it('renders the "healthy" variant with success color tokens and "Healthy" label', () => {
    render(<TaskStatusBadge status="healthy" />);

    const badge = screen.getByText('Healthy');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-status-completed/20', 'text-status-completed');
  });

  it('renders the "warning" variant with warning color tokens and "Warning" label', () => {
    render(<TaskStatusBadge status="warning" />);

    const badge = screen.getByText('Warning');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-accent-warning/20', 'text-accent-warning');
  });

  it('renders the "error" variant with error color tokens and "Error" label', () => {
    render(<TaskStatusBadge status="error" />);

    const badge = screen.getByText('Error');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-status-error/20', 'text-status-error');
  });

  it('renders the "disabled" variant with neutral color tokens and "Disabled" label', () => {
    render(<TaskStatusBadge status="disabled" />);

    const badge = screen.getByText('Disabled');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-surface-2', 'text-text-muted');
  });

  it('includes the raw status value as a title attribute for accessibility', () => {
    render(<TaskStatusBadge status="healthy" />);

    expect(screen.getByText('Healthy')).toHaveAttribute('title', 'healthy');
  });

  it('forwards additional className to the badge element', () => {
    render(<TaskStatusBadge status="warning" className="custom-class" />);

    expect(screen.getByText('Warning')).toHaveClass('custom-class');
  });
});