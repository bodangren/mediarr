import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RecentlyAddedWidget } from './RecentlyAddedWidget';

describe('RecentlyAddedWidget', () => {
  it('lists recently added media with its type and links to the detail page', () => {
    render(
      <MemoryRouter>
        <RecentlyAddedWidget
          isLoading={false}
          items={[
            {
              id: 10,
              title: 'The Walking Dead',
              added: '2026-08-17T00:02:43.000Z',
              type: 'series',
            },
            {
              id: 20,
              title: '1917',
              added: '2026-08-15T12:53:51.000Z',
              type: 'movie',
            },
          ]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('The Walking Dead')).toBeInTheDocument();
    expect(screen.getByText('1917')).toBeInTheDocument();
    expect(screen.getByText(/TV show/)).toBeInTheDocument();
    expect(screen.getByText(/Movie/)).toBeInTheDocument();
    expect(
      screen.getByText('The Walking Dead').closest('a')?.getAttribute('href'),
    ).toBe('/library/tv/10');
    expect(screen.getByText('1917').closest('a')?.getAttribute('href')).toBe(
      '/library/movies/20',
    );
  });

  it('explains an empty library instead of claiming "no recent activity"', () => {
    render(
      <MemoryRouter>
        <RecentlyAddedWidget isLoading={false} items={[]} />
      </MemoryRouter>,
    );

    // The old copy came from filtering the activity feed and read as if the
    // library were dead even when it was full of media.
    expect(screen.queryByText('No recent activity.')).not.toBeInTheDocument();
    expect(screen.getByText(/Nothing added yet/i)).toBeInTheDocument();
  });
});
