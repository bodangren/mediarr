import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ContinueWatchingWidget } from './ContinueWatchingWidget';

describe('ContinueWatchingWidget', () => {
  it('renders continue-watching items with progress and links', () => {
    render(
      <MemoryRouter>
        <ContinueWatchingWidget
          isLoading={false}
          items={[
            {
              mediaType: 'MOVIE',
              mediaId: 7,
              seriesId: null,
              title: 'Dune',
              episodeTitle: null,
              seasonNumber: null,
              episodeNumber: null,
              posterUrl: null,
              backdropUrl: null,
              position: 120,
              duration: 600,
              progress: 0.2,
              isWatched: false,
              lastWatched: '2026-04-09T00:00:00.000Z',
            },
            {
              mediaType: 'EPISODE',
              mediaId: 88,
              seriesId: 9,
              title: 'The Last of Us',
              episodeTitle: 'When You\'re Lost in the Darkness',
              seasonNumber: 1,
              episodeNumber: 1,
              posterUrl: null,
              backdropUrl: null,
              position: 300,
              duration: 1800,
              progress: 0.166,
              isWatched: false,
              lastWatched: '2026-04-09T00:01:00.000Z',
            },
          ]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Continue Watching')).toBeInTheDocument();
    expect(screen.getByText('Dune')).toBeInTheDocument();
    expect(screen.getByText('The Last of Us')).toBeInTheDocument();
    expect(screen.getByText(/S01E01/)).toBeInTheDocument();

    const movieLink = screen.getByRole('link', { name: /Dune/ });
    expect(movieLink).toHaveAttribute('href', '/library/movies/7?resume=120');

    const episodeLink = screen.getByRole('link', { name: /The Last of Us/ });
    expect(episodeLink).toHaveAttribute(
      'href',
      '/library/series/9?resumeEpisodeId=88&resumePosition=300',
    );
  });

  it('renders empty state when no items', () => {
    render(
      <MemoryRouter>
        <ContinueWatchingWidget isLoading={false} items={[]} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Nothing in progress.')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    render(
      <MemoryRouter>
        <ContinueWatchingWidget isLoading items={[]} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
