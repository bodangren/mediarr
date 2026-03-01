import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UpcomingWidget } from './UpcomingWidget';
import type { UpcomingItem } from '@/lib/api/dashboardApi';

describe('UpcomingWidget', () => {
  it('renders loading state', () => {
    render(
      <MemoryRouter>
        <UpcomingWidget items={[]} isLoading={true} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders empty state with calendar link', () => {
    render(
      <MemoryRouter>
        <UpcomingWidget items={[]} isLoading={false} />
      </MemoryRouter>,
    );

    expect(screen.getByText('No upcoming releases in the next 7 days.')).toBeInTheDocument();
    expect(screen.getByText('Calendar')).toBeInTheDocument();
  });

  it('renders upcoming items with correct status colors', () => {
    const items: UpcomingItem[] = [
      {
        id: 1,
        type: 'movie',
        title: 'Test Movie',
        date: new Date().toISOString(),
        status: 'downloaded',
        hasFile: true,
      },
      {
        id: 2,
        type: 'episode',
        title: 'Test Series',
        episodeTitle: 'Episode 1',
        seasonNumber: 1,
        episodeNumber: 1,
        date: new Date().toISOString(),
        status: 'missing',
        hasFile: false,
      },
      {
        id: 3,
        type: 'episode',
        title: 'Airing Series',
        date: new Date().toISOString(),
        status: 'airing',
        hasFile: false,
      },
    ];

    render(
      <MemoryRouter>
        <UpcomingWidget items={items} isLoading={false} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Test Movie')).toBeInTheDocument();
    expect(screen.getByText('Test Series')).toBeInTheDocument();
    expect(screen.getByText('Airing Series')).toBeInTheDocument();
    expect(screen.getByText(/S01E01 - Episode 1/)).toBeInTheDocument();
  });

  it('limits display to 6 items', () => {
    const items: UpcomingItem[] = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      type: 'movie' as const,
      title: `Movie ${i + 1}`,
      date: new Date().toISOString(),
      status: 'unaired' as const,
      hasFile: false,
    }));

    render(
      <MemoryRouter>
        <UpcomingWidget items={items} isLoading={false} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Movie 1')).toBeInTheDocument();
    expect(screen.getByText('Movie 6')).toBeInTheDocument();
    expect(screen.queryByText('Movie 7')).not.toBeInTheDocument();
  });
});
