import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { MovieDetailHeader } from './MovieDetailHeader';
import type { MovieDetail } from '@/types/movie';

const mockMovie: MovieDetail = {
  id: 1,
  title: 'Inception',
  year: 2010,
  overview: 'A thief who steals corporate secrets...',
  runtime: 148,
  certification: 'PG-13',
  posterUrl: '/posters/inception.jpg',
  backdropUrl: '/backdrops/inception.jpg',
  status: 'downloaded',
  monitored: true,
  qualityProfileId: 1,
  qualityProfileName: 'HD - 1080p',
  sizeOnDisk: 4_294_967_296,
  path: '/Movies/Inception (2010)',
  genres: ['Action', 'Adventure', 'Sci-Fi'],
  studio: 'Warner Bros. Pictures',
  collection: { id: 42, name: 'Christopher Nolan Collection' },
  ratings: {
    tmdb: 8.4,
    imdb: 8.8,
    rottenTomatoes: 87,
  },
  files: [],
  cast: [],
  crew: [],
  alternateTitles: [],
};

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('MovieDetailHeader', () => {
  it('renders movie title and year', () => {
    renderWithRouter(<MovieDetailHeader movie={mockMovie} onMonitoredChange={vi.fn()} />);

    expect(screen.getByText('Inception')).toBeInTheDocument();
    expect(screen.getByText('2010')).toBeInTheDocument();
  });

  it('renders monitored toggle button', () => {
    const handleMonitoredChange = vi.fn();
    renderWithRouter(<MovieDetailHeader movie={mockMovie} onMonitoredChange={handleMonitoredChange} />);

    const toggleButton = screen.getByRole('button', { name: /Monitored/i });
    expect(toggleButton).toBeInTheDocument();
    fireEvent.click(toggleButton);
    expect(handleMonitoredChange).toHaveBeenCalledWith(false);
  });

  it('renders ratings badges', () => {
    renderWithRouter(<MovieDetailHeader movie={mockMovie} onMonitoredChange={vi.fn()} />);

    expect(screen.getByText(/TMDB/i)).toBeInTheDocument();
    expect(screen.getByText(/8\.4/)).toBeInTheDocument();
    expect(screen.getByText(/IMDb/i)).toBeInTheDocument();
    expect(screen.getByText(/8\.8/)).toBeInTheDocument();
    expect(screen.getByText(/RT/i)).toBeInTheDocument();
    expect(screen.getByText(/87%/)).toBeInTheDocument();
  });

  it('renders size and collection information', () => {
    renderWithRouter(<MovieDetailHeader movie={mockMovie} onMonitoredChange={vi.fn()} />);

    expect(screen.getByText(/4\.0 GB/)).toBeInTheDocument();
    expect(screen.getByText('Christopher Nolan Collection')).toBeInTheDocument();
  });

  it('renders collection as a link to the collection detail page', () => {
    renderWithRouter(<MovieDetailHeader movie={mockMovie} onMonitoredChange={vi.fn()} />);

    const collectionLink = screen.getByRole('link', { name: 'Christopher Nolan Collection' });
    expect(collectionLink).toBeInTheDocument();
    expect(collectionLink).toHaveAttribute('href', '/library/collections/42');
  });

  it('does not render navigation buttons when handlers not provided', () => {
    renderWithRouter(<MovieDetailHeader movie={mockMovie} onMonitoredChange={vi.fn()} />);

    expect(screen.queryAllByRole('button')).toHaveLength(2);
  });

  it('renders navigation buttons when handlers provided', () => {
    const handlePrevious = vi.fn();
    const handleNext = vi.fn();
    renderWithRouter(
      <MovieDetailHeader
        movie={mockMovie}
        onMonitoredChange={vi.fn()}
        onPreviousMovie={handlePrevious}
        onNextMovie={handleNext}
      />,
    );

    expect(screen.getAllByRole('button')).toHaveLength(4);
  });
});
