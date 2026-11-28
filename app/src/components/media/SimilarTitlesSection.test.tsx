import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { SimilarTitlesSection } from './SimilarTitlesSection';
import type { SimilarTitle } from '@/lib/api/similarTitles';

/**
 * Owner request 2026-11-28: similar titles under movie/series details, with availability, and a
 * context menu to request a missing one.
 */
const similar: SimilarTitle[] = [
  {
    mediaType: 'MOVIE',
    tmdbId: 1,
    title: 'In Library Film',
    year: 2012,
    posterUrl: null,
    overview: null,
    voteAverage: 7.1,
    inLibrary: true,
    libraryId: 42,
  },
  {
    mediaType: 'MOVIE',
    tmdbId: 2,
    title: 'Missing Film',
    year: 2018,
    posterUrl: null,
    overview: null,
    voteAverage: 6.5,
    inLibrary: false,
    libraryId: null,
  },
  {
    mediaType: 'SERIES',
    tmdbId: 3,
    title: 'Missing Show',
    year: 2004,
    posterUrl: null,
    overview: null,
    voteAverage: null,
    inLibrary: false,
    libraryId: null,
  },
];

function renderSection(props: Partial<Parameters<typeof SimilarTitlesSection>[0]> = {}) {
  return render(
    <MemoryRouter>
      <SimilarTitlesSection heading="More like this" items={similar} {...props} />
    </MemoryRouter>,
  );
}

describe('SimilarTitlesSection', () => {
  it('shows availability and deep-links titles already in the library', () => {
    renderSection();

    expect(screen.getByText('In Library Film')).toBeInTheDocument();
    expect(screen.getByText('In library')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open in library' })).toHaveAttribute('href', '/library/movies/42');
    expect(screen.getAllByText('Missing')).toHaveLength(2);
  });

  it('requests a missing movie from its context menu', () => {
    const onRequestMovie = vi.fn();
    renderSection({ onRequestMovie });

    fireEvent.click(screen.getByText('Request movie'));

    expect(onRequestMovie).toHaveBeenCalledWith(expect.objectContaining({ tmdbId: 2, title: 'Missing Film' }));
  });

  it('offers search-and-add for series (no direct TMDB request path) and degrades to a note on error', () => {
    const onSearchTitle = vi.fn();
    const { rerender } = renderSection({ onSearchTitle });

    expect(screen.getAllByText('Search & add').length).toBeGreaterThan(0);
    expect(screen.queryByText('Request movie')).toBeNull();

    rerender(
      <MemoryRouter>
        <SimilarTitlesSection heading="More like this" items={[]} error="TMDB API Key is missing" />
      </MemoryRouter>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('TMDB API Key is missing');
  });
});
