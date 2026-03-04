import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { MovieOverviewView } from './MovieOverviewView';
import type { MovieListItem } from '@/types/movie';

const mockMovies: MovieListItem[] = [
  {
    id: 1,
    title: 'The Matrix',
    year: 1999,
    status: 'released',
    monitored: true,
    posterUrl: '/test-poster.jpg',
    overview: 'A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.',
    runtime: 136,
    certification: 'R',
    ratings: { tmdb: 8.2, imdb: 8.7 },
    fileVariants: [{ id: 1, path: '/path/to/matrix.mkv' }],
    tmdbId: 603,
  },
  {
    id: 2,
    title: 'Inception',
    year: 2010,
    status: 'released',
    monitored: false,
    posterUrl: '/test-poster2.jpg',
    overview: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.',
    runtime: 148,
    certification: 'PG-13',
    ratings: { tmdb: 8.4, imdb: 8.8 },
    fileVariants: [],
    tmdbId: 27205,
  },
];

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('MovieOverviewView', () => {
  it('renders movie overview cards', () => {
    const onToggleMonitored = vi.fn();
    renderWithRouter(<MovieOverviewView items={mockMovies} onToggleMonitored={onToggleMonitored} />);

    expect(screen.getByText('The Matrix')).toBeInTheDocument();
    expect(screen.getByText('Inception')).toBeInTheDocument();
    expect(screen.getByText('1999')).toBeInTheDocument();
    expect(screen.getByText('2010')).toBeInTheDocument();
  });

  it('calls onToggleMonitored when monitoring button is clicked', () => {
    const onToggleMonitored = vi.fn();
    renderWithRouter(<MovieOverviewView items={mockMovies} onToggleMonitored={onToggleMonitored} />);

    const firstMovieCard = screen.getByText('The Matrix').closest('article');
    const toggleButton = firstMovieCard?.querySelector('button[aria-label*="Disable"]');
    expect(toggleButton).toBeInTheDocument();

    if (toggleButton) {
      fireEvent.click(toggleButton);
      expect(onToggleMonitored).toHaveBeenCalledWith(1, false);
    }
  });

  it('calls onDelete when delete button is clicked', () => {
    const onToggleMonitored = vi.fn();
    const onDelete = vi.fn();
    // Mock window.confirm
    window.confirm = vi.fn(() => true);

    renderWithRouter(
      <MovieOverviewView
        items={mockMovies}
        onToggleMonitored={onToggleMonitored}
        onDelete={onDelete}
      />,
    );

    const firstMovieCard = screen.getByText('The Matrix').closest('article');
    const deleteButton = firstMovieCard?.querySelector('button[aria-label*="Delete"]');
    expect(deleteButton).toBeInTheDocument();

    if (deleteButton) {
      fireEvent.click(deleteButton);
      expect(window.confirm).toHaveBeenCalledWith('Delete The Matrix?');
      expect(onDelete).toHaveBeenCalledWith(1);
    }
  });

  it('calls onSearch when search button is clicked', () => {
    const onToggleMonitored = vi.fn();
    const onSearch = vi.fn();

    renderWithRouter(
      <MovieOverviewView
        items={mockMovies}
        onToggleMonitored={onToggleMonitored}
        onSearch={onSearch}
      />,
    );

    const firstMovieCard = screen.getByText('The Matrix').closest('article');
    const searchButton = firstMovieCard?.querySelector('button[aria-label*="Search"]');
    expect(searchButton).toBeInTheDocument();

    if (searchButton) {
      fireEvent.click(searchButton);
      expect(onSearch).toHaveBeenCalledWith(1);
    }
  });

  it('displays empty state when no items', () => {
    const onToggleMonitored = vi.fn();
    renderWithRouter(<MovieOverviewView items={[]} onToggleMonitored={onToggleMonitored} />);

    expect(screen.getByText('No movies found')).toBeInTheDocument();
  });

  it('expands and collapses overview text', () => {
    const onToggleMonitored = vi.fn();
    renderWithRouter(<MovieOverviewView items={mockMovies} onToggleMonitored={onToggleMonitored} />);

    // Initially, "Show more" buttons should be visible
    const showMoreButtons = screen.getAllByText('Show more');
    expect(showMoreButtons.length).toBe(2);

    // Overview text should not be visible initially
    expect(screen.queryByText(/A computer hacker learns/)).not.toBeInTheDocument();

    // Click the first show more button to expand
    fireEvent.click(showMoreButtons[0]);
    expect(screen.getByText('Show less')).toBeInTheDocument();

    // Overview text should now be visible
    expect(screen.getByText(/A computer hacker learns/)).toBeInTheDocument();
  });

  it('displays rating and TMDb ID', () => {
    const onToggleMonitored = vi.fn();
    renderWithRouter(<MovieOverviewView items={mockMovies} onToggleMonitored={onToggleMonitored} />);

    // Check for rating display - use getAllByText since there are two movies
    const stars = screen.getAllByText('⭐');
    expect(stars.length).toBe(2);

    const ratings = screen.getAllByText(/8\.\d/);
    expect(ratings.length).toBe(2);

    // Check for TMDb ID
    expect(screen.getByText('TMDb: 603')).toBeInTheDocument();
    expect(screen.getByText('TMDb: 27205')).toBeInTheDocument();
  });

  it('displays runtime and certification', () => {
    const onToggleMonitored = vi.fn();
    renderWithRouter(<MovieOverviewView items={mockMovies} onToggleMonitored={onToggleMonitored} />);

    // Check for runtime display
    expect(screen.getByText('2h 16m')).toBeInTheDocument(); // 136 minutes

    // Check for certification
    expect(screen.getByText('R')).toBeInTheDocument();
  });

  it('navigates to movie detail when card is clicked', () => {
    const onToggleMonitored = vi.fn();
    renderWithRouter(<MovieOverviewView items={mockMovies} onToggleMonitored={onToggleMonitored} />);

    const link = screen.getByText('The Matrix').closest('a');
    expect(link).toHaveAttribute('href', '/library/movies/1');
  });

  it('shows loading skeletons when isLoading is true', () => {
    const onToggleMonitored = vi.fn();
    renderWithRouter(<MovieOverviewView items={[]} onToggleMonitored={onToggleMonitored} isLoading />);

    // Check that skeleton elements are rendered
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);

    // Ensure no movie text is visible
    expect(screen.queryByText('The Matrix')).not.toBeInTheDocument();
  });

  it('handles missing posterUrl with fallback', () => {
    const onToggleMonitored = vi.fn();
    const movieWithoutPoster: MovieListItem = {
      ...mockMovies[0],
      posterUrl: undefined,
    };
    renderWithRouter(<MovieOverviewView items={[movieWithoutPoster]} onToggleMonitored={onToggleMonitored} />);

    // Should still render the card without posterUrl
    expect(screen.getByText('The Matrix')).toBeInTheDocument();

    const card = screen.getByText('The Matrix').closest('article');
    const img = card?.querySelector('img');
    expect(img).toHaveAttribute('src', '/images/placeholder-poster.png');
  });

  it('does not show "Show more" button when overview is missing', () => {
    const onToggleMonitored = vi.fn();
    const movieWithoutOverview: MovieListItem = {
      ...mockMovies[0],
      overview: undefined,
    };
    renderWithRouter(<MovieOverviewView items={[movieWithoutOverview]} onToggleMonitored={onToggleMonitored} />);

    // "Show more" button should not be visible
    expect(screen.queryByText('Show more')).not.toBeInTheDocument();
  });
});
