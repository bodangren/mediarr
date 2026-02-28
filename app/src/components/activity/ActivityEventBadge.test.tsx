import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActivityEventBadge } from '@/components/activity/ActivityEventBadge';

describe('ActivityEventBadge', () => {
  it('renders RELEASE_GRABBED with primary color', () => {
    render(<ActivityEventBadge eventType="RELEASE_GRABBED" />);
    const badge = screen.getByText('Grabbed');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-accent-primary/20', 'text-accent-primary');
  });

  it('renders IMPORT_COMPLETED with success color', () => {
    render(<ActivityEventBadge eventType="IMPORT_COMPLETED" />);
    const badge = screen.getByText('Imported');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-status-completed/20', 'text-status-completed');
  });

  it('renders MOVIE_IMPORTED with success color', () => {
    render(<ActivityEventBadge eventType="MOVIE_IMPORTED" />);
    const badge = screen.getByText('Movie Imported');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-status-completed/20', 'text-status-completed');
  });

  it('renders SERIES_IMPORTED with success color', () => {
    render(<ActivityEventBadge eventType="SERIES_IMPORTED" />);
    const badge = screen.getByText('Episode Imported');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-status-completed/20', 'text-status-completed');
  });

  it('renders IMPORT_FAILED with error color', () => {
    render(<ActivityEventBadge eventType="IMPORT_FAILED" />);
    const badge = screen.getByText('Import Failed');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-status-error/20', 'text-status-error');
  });

  it('renders MEDIA_ADDED with info color', () => {
    render(<ActivityEventBadge eventType="MEDIA_ADDED" />);
    const badge = screen.getByText('Added');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-accent-info/20', 'text-accent-info');
  });

  it('renders SEARCH_EXECUTED with neutral color', () => {
    render(<ActivityEventBadge eventType="SEARCH_EXECUTED" />);
    const badge = screen.getByText('Search');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-surface-2', 'text-text-secondary');
  });

  it('renders SUBTITLE_DOWNLOADED with info color', () => {
    render(<ActivityEventBadge eventType="SUBTITLE_DOWNLOADED" />);
    const badge = screen.getByText('Subtitle');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-accent-info/20', 'text-accent-info');
  });

  it('renders SEEDING_COMPLETE with neutral color', () => {
    render(<ActivityEventBadge eventType="SEEDING_COMPLETE" />);
    const badge = screen.getByText('Seeding Done');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-surface-2', 'text-text-secondary');
  });

  it('renders unknown event type as raw string with neutral color', () => {
    render(<ActivityEventBadge eventType="UNKNOWN_FUTURE_EVENT" />);
    const badge = screen.getByText('UNKNOWN_FUTURE_EVENT');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-surface-2', 'text-text-secondary');
  });

  it('includes title attribute with the raw event type', () => {
    render(<ActivityEventBadge eventType="RELEASE_GRABBED" />);
    expect(screen.getByText('Grabbed')).toHaveAttribute('title', 'RELEASE_GRABBED');
  });
});
