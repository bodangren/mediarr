import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MovieCell } from '@/components/activity/MovieCell';

describe('MovieCell', () => {
  it('renders movie with poster and title', () => {
    render(
      <MovieCell
        movieId={101}
        title="Test Movie"
        posterUrl="https://example.com/poster.jpg"
        year={2024}
      />,
    );

    expect(screen.getByText('Test Movie')).toBeInTheDocument();
    expect(screen.getByText('2024')).toBeInTheDocument();
    expect(screen.getByAltText('Test Movie poster')).toBeInTheDocument();
  });

  it('renders movie without poster', () => {
    render(<MovieCell movieId={101} title="Test Movie" />);

    expect(screen.getByText('Test Movie')).toBeInTheDocument();
    expect(screen.getByText('No poster')).toBeInTheDocument();
  });

  it('renders as link when movieId is provided', () => {
    render(
      <MovieCell
        movieId={101}
        title="Test Movie"
        posterUrl="https://example.com/poster.jpg"
      />,
    );

    const link = screen.getByText('Test Movie').closest('a');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/movie/101');
  });

  it('renders as plain text when movieId is not provided', () => {
    render(<MovieCell title="Test Movie" />);

    const link = screen.getByText('Test Movie').closest('a');
    expect(link).not.toBeInTheDocument();
  });

  it('renders small size by default', () => {
    const { container } = render(
      <MovieCell
        movieId={101}
        title="Test Movie"
        posterUrl="https://example.com/poster.jpg"
      />,
    );

    const poster = container.querySelector('.w-10');
    expect(poster).toBeInTheDocument();
  });

  it('renders medium size when specified', () => {
    const { container } = render(
      <MovieCell
        movieId={101}
        title="Test Movie"
        posterUrl="https://example.com/poster.jpg"
        size="medium"
      />,
    );

    const poster = container.querySelector('.w-12');
    expect(poster).toBeInTheDocument();
  });
});
