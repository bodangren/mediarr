import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MovieCell } from '@/components/activity/MovieCell';

function renderMovieCell(props: React.ComponentProps<typeof MovieCell>) {
  return render(
    <MemoryRouter>
      <MovieCell {...props} />
    </MemoryRouter>,
  );
}

describe('MovieCell', () => {
  it('renders movie with poster and title', () => {
    renderMovieCell({
      movieId: 101,
      title: 'Test Movie',
      posterUrl: 'https://example.com/poster.jpg',
      year: 2024,
    });

    expect(screen.getByText('Test Movie')).toBeInTheDocument();
    expect(screen.getByText('2024')).toBeInTheDocument();
    expect(screen.getByAltText('Test Movie poster')).toBeInTheDocument();
  });

  it('renders movie without poster', () => {
    renderMovieCell({ movieId: 101, title: 'Test Movie' });

    expect(screen.getByText('Test Movie')).toBeInTheDocument();
    expect(screen.getByText('No poster')).toBeInTheDocument();
  });

  it('renders as link when movieId is provided', () => {
    renderMovieCell({
      movieId: 101,
      title: 'Test Movie',
      posterUrl: 'https://example.com/poster.jpg',
    });

    const link = screen.getByRole('link', { name: /test movie/i });
    expect(link).toHaveAttribute('href', '/movie/101');
  });

  it('renders as plain text when movieId is not provided', () => {
    renderMovieCell({ title: 'Test Movie' });

    const link = screen.getByText('Test Movie').closest('a');
    expect(link).not.toBeInTheDocument();
  });

  it('renders small size by default', () => {
    const { container } = renderMovieCell({
      movieId: 101,
      title: 'Test Movie',
      posterUrl: 'https://example.com/poster.jpg',
    });

    const poster = container.querySelector('.w-10');
    expect(poster).toBeInTheDocument();
  });

  it('renders medium size when specified', () => {
    const { container } = renderMovieCell({
      movieId: 101,
      title: 'Test Movie',
      posterUrl: 'https://example.com/poster.jpg',
      size: 'medium',
    });

    const poster = container.querySelector('.w-12');
    expect(poster).toBeInTheDocument();
  });
});
