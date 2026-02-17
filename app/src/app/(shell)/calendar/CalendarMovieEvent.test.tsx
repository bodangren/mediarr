import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { CalendarMovieEvent } from './CalendarMovieEvent';
import type { CalendarMovie } from '@/types/calendar';

describe('CalendarMovieEvent', () => {
  const mockMovie: CalendarMovie = {
    id: 1,
    movieId: 101,
    title: 'Dune: Part Two',
    releaseType: 'cinema',
    releaseDate: '2024-03-01',
    posterUrl: 'https://example.com/poster.jpg',
    status: 'monitored',
    hasFile: false,
    monitored: true,
    certification: 'PG-13',
    runtime: 166,
  };

  it('renders movie information', () => {
    render(<CalendarMovieEvent movie={mockMovie} />);

    expect(screen.getByText('Dune: Part Two')).toBeInTheDocument();
    expect(screen.getByText('monitored')).toBeInTheDocument(); // StatusBadge normalizes to lowercase
    expect(screen.getByText('Cinema')).toBeInTheDocument();
    expect(screen.getByText('PG-13')).toBeInTheDocument();
    expect(screen.getByText('166m')).toBeInTheDocument();
  });

  it('renders poster when provided', () => {
    render(<CalendarMovieEvent movie={mockMovie} />);

    const poster = screen.getByAltText('Dune: Part Two');
    expect(poster).toBeInTheDocument();
    expect(poster).toHaveAttribute('src', 'https://example.com/poster.jpg');
  });

  it('handles click event', async () => {
    const handleClick = vi.fn();
    render(<CalendarMovieEvent movie={mockMovie} onClick={handleClick} />);

    const link = screen.getByRole('link');
    await userEvent.click(link);

    expect(handleClick).toHaveBeenCalledWith(mockMovie);
  });

  it('shows different release types', () => {
    const { rerender } = render(<CalendarMovieEvent movie={mockMovie} />);
    expect(screen.getByText('Cinema')).toBeInTheDocument();

    const digitalMovie = { ...mockMovie, releaseType: 'digital' as const };
    rerender(<CalendarMovieEvent movie={digitalMovie} />);
    expect(screen.getByText('Digital')).toBeInTheDocument();

    const physicalMovie = { ...mockMovie, releaseType: 'physical' as const };
    rerender(<CalendarMovieEvent movie={physicalMovie} />);
    expect(screen.getByText('Physical')).toBeInTheDocument();
  });

  it('shows different statuses', () => {
    const { rerender } = render(<CalendarMovieEvent movie={mockMovie} />);

    // Monitored (normalized to lowercase)
    expect(screen.getByText('monitored')).toBeInTheDocument();

    // Downloaded
    const downloadedMovie = { ...mockMovie, status: 'downloaded' as const };
    rerender(<CalendarMovieEvent movie={downloadedMovie} />);
    expect(screen.getByText('downloaded')).toBeInTheDocument();

    // Missing
    const missingMovie = { ...mockMovie, status: 'missing' as const };
    rerender(<CalendarMovieEvent movie={missingMovie} />);
    expect(screen.getByText('missing')).toBeInTheDocument();

    // Unmonitored
    const unmonitoredMovie = { ...mockMovie, status: 'unmonitored' as const };
    rerender(<CalendarMovieEvent movie={unmonitoredMovie} />);
    expect(screen.getByText('unmonitored')).toBeInTheDocument();
  });

  it('does not render poster when not provided', () => {
    const movieWithoutPoster = { ...mockMovie, posterUrl: undefined };
    render(<CalendarMovieEvent movie={movieWithoutPoster} />);

    expect(screen.queryByAltText('Dune: Part Two')).not.toBeInTheDocument();
  });

  it('omits optional fields when not provided', () => {
    const movieWithoutOptional = {
      ...mockMovie,
      certification: undefined,
      runtime: undefined,
    };
    render(<CalendarMovieEvent movie={movieWithoutOptional} />);

    expect(screen.queryByText('PG-13')).not.toBeInTheDocument();
    expect(screen.queryByText('166m')).not.toBeInTheDocument();
  });
});
