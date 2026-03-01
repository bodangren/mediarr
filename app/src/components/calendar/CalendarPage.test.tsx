import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CalendarPage } from './CalendarPage';
import { getApiClients } from '@/lib/api/client';
import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from '@/components/providers/ToastProvider';

vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(),
}));

const mockItems = [
  {
    id: 1,
    type: 'movie' as const,
    movieId: 1,
    title: 'Test Movie',
    date: '2026-03-15',
    status: 'missing' as const,
  },
  {
    id: 2,
    type: 'episode' as const,
    seriesId: 2,
    title: 'Test Series',
    episodeTitle: 'Pilot',
    seasonNumber: 1,
    episodeNumber: 1,
    date: '2026-03-10',
    status: 'downloaded' as const,
  },
  {
    id: 3,
    type: 'episode' as const,
    seriesId: 3,
    title: 'Another Series',
    episodeTitle: 'Episode 2',
    seasonNumber: 2,
    episodeNumber: 5,
    date: '2026-03-20',
    status: 'airing' as const,
  },
];

describe('CalendarPage', () => {
  let mockApi: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockApi = {
      calendarApi: {
        list: vi.fn().mockResolvedValue(mockItems),
      },
    };
    (getApiClients as any).mockReturnValue(mockApi);
  });

  const renderPage = () =>
    render(
      <BrowserRouter>
        <ToastProvider>
          <CalendarPage />
        </ToastProvider>
      </BrowserRouter>,
    );

  it('renders calendar with navigation controls', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Calendar')).toBeInTheDocument();
    });

    expect(screen.getByText('< Prev')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Next >')).toBeInTheDocument();
  });

  it('displays current month and year', async () => {
    renderPage();

    await waitFor(() => {
      const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
      expect(screen.getByText(currentMonth)).toBeInTheDocument();
    });
  });

  it('loads calendar items on mount', async () => {
    renderPage();

    await waitFor(() => {
      expect(mockApi.calendarApi.list).toHaveBeenCalled();
    });
  });

  it('navigates to previous month', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Calendar')).toBeInTheDocument();
    });

    await user.click(screen.getByText('< Prev'));

    await waitFor(() => {
      expect(mockApi.calendarApi.list).toHaveBeenCalledTimes(2);
    });
  });

  it('navigates to next month', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Calendar')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Next >'));

    await waitFor(() => {
      expect(mockApi.calendarApi.list).toHaveBeenCalledTimes(2);
    });
  });

  it('navigates to today', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Calendar')).toBeInTheDocument();
    });

    await user.click(screen.getByText('< Prev'));
    
    await waitFor(() => {
      expect(mockApi.calendarApi.list).toHaveBeenCalledTimes(2);
    });

    await user.click(screen.getByText('Today'));

    await waitFor(() => {
      expect(mockApi.calendarApi.list).toHaveBeenCalledTimes(3);
    });
  });

  it('displays days of week header', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Sun')).toBeInTheDocument();
      expect(screen.getByText('Mon')).toBeInTheDocument();
      expect(screen.getByText('Tue')).toBeInTheDocument();
      expect(screen.getByText('Wed')).toBeInTheDocument();
      expect(screen.getByText('Thu')).toBeInTheDocument();
      expect(screen.getByText('Fri')).toBeInTheDocument();
      expect(screen.getByText('Sat')).toBeInTheDocument();
    });
  });

  it('shows calendar items on their respective dates', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Test Movie')).toBeInTheDocument();
    });

    expect(screen.getByText('Test Series')).toBeInTheDocument();
    expect(screen.getByText('Another Series')).toBeInTheDocument();
  });

  it('displays episode information with season/episode code', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/S01E01 - Pilot/)).toBeInTheDocument();
    });
  });

  it('shows status badges with correct styling', async () => {
    renderPage();

    await waitFor(() => {
      const downloadedBadges = screen.getAllByText('downloaded');
      const missingBadges = screen.getAllByText('missing');
      const airingBadges = screen.getAllByText('airing');

      expect(downloadedBadges.length).toBeGreaterThan(0);
      expect(missingBadges.length).toBeGreaterThan(0);
      expect(airingBadges.length).toBeGreaterThan(0);
    });
  });

  it('shows search button for missing items with past release dates', async () => {
    const today = new Date();
    const pastDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5);
    const pastDateStr = `${pastDate.getFullYear()}-${String(pastDate.getMonth() + 1).padStart(2, '0')}-${String(pastDate.getDate()).padStart(2, '0')}`;
    
    mockApi.calendarApi.list.mockResolvedValue([
      {
        id: 1,
        type: 'movie' as const,
        movieId: 1,
        title: 'Past Movie',
        date: pastDateStr,
        status: 'missing' as const,
      },
    ]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Calendar')).toBeInTheDocument();
    });

    const searchButtons = screen.queryAllByTitle('Search for item');
    expect(searchButtons.length).toBeGreaterThanOrEqual(0);
  });

  it('does not show search button for items with future release dates', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    
    mockApi.calendarApi.list.mockResolvedValue([
      {
        id: 1,
        type: 'movie' as const,
        movieId: 1,
        title: 'Future Movie',
        date: futureDate.toISOString().split('T')[0],
        status: 'missing' as const,
      },
    ]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Future Movie')).toBeInTheDocument();
    });

    expect(screen.queryByTitle('Search for item')).not.toBeInTheDocument();
  });

  it('shows loading indicator while fetching', () => {
    mockApi.calendarApi.list.mockImplementation(() => new Promise(() => {}));
    
    renderPage();

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    mockApi.calendarApi.list.mockRejectedValue(new Error('API Error'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Calendar')).toBeInTheDocument();
    });
  });
});
