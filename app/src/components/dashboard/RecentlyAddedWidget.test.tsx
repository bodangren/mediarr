import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RecentlyAddedWidget } from './RecentlyAddedWidget';

describe('RecentlyAddedWidget', () => {
  it('includes MOVIE_IMPORTED and SERIES_IMPORTED entries', () => {
    render(
      <MemoryRouter>
        <RecentlyAddedWidget
          isLoading={false}
          items={[
            {
              id: 1,
              eventType: 'MOVIE_IMPORTED',
              summary: 'Movie import complete',
              occurredAt: '2026-03-01T12:00:00.000Z',
            },
            {
              id: 2,
              eventType: 'SERIES_IMPORTED',
              summary: 'Episode import complete',
              occurredAt: '2026-03-01T12:30:00.000Z',
            },
            {
              id: 3,
              eventType: 'RELEASE_GRABBED',
              summary: 'Grabbed release',
              occurredAt: '2026-03-01T13:00:00.000Z',
            },
          ]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Movie import complete')).toBeInTheDocument();
    expect(screen.getByText('Episode import complete')).toBeInTheDocument();
    expect(screen.queryByText('Grabbed release')).not.toBeInTheDocument();
  });
});
