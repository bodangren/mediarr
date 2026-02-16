import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SearchResultCard, type SearchResultCardProps } from './SearchResultCard';

describe('SearchResultCard', () => {
  const defaultProps: SearchResultCardProps = {
    title: 'Test Series',
    year: 2022,
    overview: 'A test series overview for testing purposes.',
    network: 'Test Network',
    status: 'continuing',
    posterUrl: '/test-poster.jpg',
    mediaType: 'TV',
    isSelected: false,
    alreadyAdded: false,
    onSelect: vi.fn(),
  };

  it('renders title and year', () => {
    render(<SearchResultCard {...defaultProps} />);

    expect(screen.getByText('Test Series')).toBeInTheDocument();
    expect(screen.getByText('2022')).toBeInTheDocument();
  });

  it('renders network information', () => {
    render(<SearchResultCard {...defaultProps} />);

    expect(screen.getByText('Test Network')).toBeInTheDocument();
  });

  it('renders truncated overview', () => {
    render(<SearchResultCard {...defaultProps} />);

    expect(screen.getByText(/A test series overview for testing purposes/)).toBeInTheDocument();
  });

  it('renders placeholder when overview is missing', () => {
    render(<SearchResultCard {...defaultProps} overview={undefined} />);

    expect(screen.getByText('No overview available.')).toBeInTheDocument();
  });

  it('truncates long overview text', () => {
    const longOverview = 'A'.repeat(200);
    render(<SearchResultCard {...defaultProps} overview={longOverview} />);

    // The overview should be truncated to 150 characters + '...'
    const expectedTruncated = 'A'.repeat(150) + '...';
    expect(screen.getByText(expectedTruncated)).toBeInTheDocument();
  });

  it('renders poster image with correct src', () => {
    render(<SearchResultCard {...defaultProps} />);

    const img = screen.getByAltText('Test Series') as HTMLImageElement;
    expect(img.src).toContain('/test-poster.jpg');
  });

  it('renders placeholder poster when posterUrl is not provided', () => {
    render(<SearchResultCard {...defaultProps} posterUrl={undefined} />);

    const img = screen.getByAltText('Test Series') as HTMLImageElement;
    expect(img.src).toContain('/images/placeholder-poster.png');
  });

  it('shows monitored badge when alreadyAdded is true', () => {
    render(<SearchResultCard {...defaultProps} alreadyAdded />);

    expect(screen.getByText('monitored')).toBeInTheDocument();
  });

  it('does not show monitored badge when alreadyAdded is false', () => {
    render(<SearchResultCard {...defaultProps} alreadyAdded={false} />);

    expect(screen.queryByText('monitored')).not.toBeInTheDocument();
  });

  it('shows "Select" button when not already added', () => {
    render(<SearchResultCard {...defaultProps} alreadyAdded={false} />);

    expect(screen.getByRole('button', { name: 'Select' })).toBeInTheDocument();
  });

  it('shows "Review Config" button when already added', () => {
    render(<SearchResultCard {...defaultProps} alreadyAdded />);

    expect(screen.getByRole('button', { name: 'Review Config' })).toBeInTheDocument();
  });

  it('calls onSelect when button is clicked', () => {
    const onSelect = vi.fn();
    render(<SearchResultCard {...defaultProps} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: 'Select' }));

    expect(onSelect).toHaveBeenCalled();
  });

  it('applies selected styles when isSelected is true', () => {
    const { container } = render(<SearchResultCard {...defaultProps} isSelected />);

    const article = container.querySelector('article');
    expect(article?.className).toContain('border-accent-primary');
    expect(article?.className).toContain('bg-accent-primary/10');
  });

  it('applies default styles when isSelected is false', () => {
    const { container } = render(<SearchResultCard {...defaultProps} isSelected={false} />);

    const article = container.querySelector('article');
    expect(article?.className).toContain('border-border-subtle');
  });

  it('renders status badge for continuing status', () => {
    render(<SearchResultCard {...defaultProps} status="continuing" />);

    expect(screen.getByText('continuing')).toBeInTheDocument();
  });

  it('renders status badge for ended status', () => {
    render(<SearchResultCard {...defaultProps} status="ended" />);

    expect(screen.getByText('ended')).toBeInTheDocument();
  });

  it('renders status badge for upcoming status', () => {
    render(<SearchResultCard {...defaultProps} status="upcoming" />);

    expect(screen.getByText('upcoming')).toBeInTheDocument();
  });

  it('renders without year when not provided', () => {
    render(<SearchResultCard {...defaultProps} year={undefined} />);

    expect(screen.queryByText('2022')).not.toBeInTheDocument();
  });

  it('renders without network when not provided', () => {
    render(<SearchResultCard {...defaultProps} network={undefined} />);

    expect(screen.queryByText('Test Network')).not.toBeInTheDocument();
  });

  it('renders without status when not provided', () => {
    const { container } = render(<SearchResultCard {...defaultProps} status={undefined} />);

    // Should not have status badge
    const badges = container.querySelectorAll('.inline-flex.rounded-full');
    expect(badges.length).toBe(0);
  });
});
