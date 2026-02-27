import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CalendarPage from './page';
import * as apiClientModule from '@/lib/api/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getCalendarStore } from '@/lib/state/calendarStore';

// Mock the API client
vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(),
}));

// Mock the calendar store
vi.mock('@/lib/state/calendarStore', () => ({
  getCalendarStore: vi.fn(),
}));

describe('CalendarPage', () => {
  let queryClient: QueryClient;
  let mockGetApiClients: ReturnType<typeof vi.fn>;
  let mockGetCalendarStore: ReturnType<typeof vi.fn>;
  let mockListEpisodes: ReturnType<typeof vi.fn>;
  let mockListMovies: ReturnType<typeof vi.fn>;
  let mockDispatch: ReturnType<typeof vi.fn>;

  const mockEpisodes = [
    {
      id: 1,
      seriesId: 1,
      seriesTitle: 'Test Series',
      seasonNumber: 1,
      episodeNumber: 1,
      episodeTitle: 'Test Episode',
      airDate: new Date().toISOString().split('T')[0]!,
      airTime: '20:00',
      status: 'unaired' as const,
      hasFile: false,
      monitored: true,
    },
  ];

  const mockMovies = [
    {
      id: 1,
      movieId: 101,
      title: 'Test Movie',
      releaseType: 'cinema' as const,
      releaseDate: new Date().toISOString().split('T')[0]!,
      posterUrl: 'https://example.com/poster.jpg',
      status: 'monitored' as const,
      hasFile: false,
      monitored: true,
      certification: 'PG-13',
      runtime: 120,
    },
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    mockListEpisodes = vi.fn().mockResolvedValue(mockEpisodes);
    mockListMovies = vi.fn().mockResolvedValue(mockMovies);
    mockDispatch = vi.fn();

    mockGetApiClients = vi.mocked(apiClientModule.getApiClients);
    mockGetApiClients.mockReturnValue({
      calendarApi: {
        listCalendarEpisodes: mockListEpisodes,
        listCalendarMovies: mockListMovies,
      },
    } as unknown as ReturnType<typeof apiClientModule.getApiClients>);

    mockGetCalendarStore = vi.mocked(getCalendarStore);
    mockGetCalendarStore.mockReturnValue({
      getState: vi.fn(() => ({
        currentDate: new Date().toISOString().split('T')[0]!,
        viewMode: 'calendar',
        contentType: 'all',
        dayCount: 7,
        filters: {},
        options: {
          showDayNumbers: true,
          showWeekNumbers: false,
          showMonitored: true,
          showUnmonitored: true,
          showCinemaReleases: true,
          showDigitalReleases: true,
          showPhysicalReleases: true,
        },
      })),
      dispatch: mockDispatch,
    });
  });

  function renderCalendarPage() {
    return render(
      <QueryClientProvider client={queryClient}>
        <CalendarPage />
      </QueryClientProvider>,
    );
  }

  it('renders the calendar page header', async () => {
    renderCalendarPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Calendar' })).toBeInTheDocument();
      expect(screen.getByText('View upcoming TV episodes and movie releases')).toBeInTheDocument();
    });
  });

  it('renders navigation controls with disabled feature buttons', async () => {
    renderCalendarPage();

    await waitFor(() => {
      expect(screen.getByText('← Previous')).toBeInTheDocument();
      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.getByText('Next →')).toBeInTheDocument();
      expect(screen.getAllByText('Calendar')).toHaveLength(2); // Header + button
      expect(screen.getByText('Agenda')).toBeInTheDocument();
      expect(screen.getByText('iCal')).toBeInTheDocument();
    });

    // Verify feature buttons are disabled with tooltips
    const icalButton = screen.getByText('iCal');
    expect(icalButton).toBeDisabled();
    expect(icalButton).toHaveAttribute('title', 'iCal export not yet available');

    const searchMissingButton = screen.getByText('Search Missing');
    expect(searchMissingButton).toBeDisabled();
    expect(searchMissingButton).toHaveAttribute('title', 'Search for missing not yet available');

    const rssSyncButton = screen.getByText('RSS Sync');
    expect(rssSyncButton).toBeDisabled();
    expect(rssSyncButton).toHaveAttribute('title', 'RSS Sync not yet available');
  });

  it('renders calendar view when view mode is calendar', async () => {
    renderCalendarPage();

    await waitFor(() => {
      expect(screen.getByText('Test Series')).toBeInTheDocument();
      expect(screen.getByText('S01E01 - Test Episode')).toBeInTheDocument();
    });
  });

  it('renders legend', async () => {
    renderCalendarPage();

    await waitFor(() => {
      expect(screen.getByText('Legend:')).toBeInTheDocument();
      // StatusBadge normalizes to lowercase
      expect(screen.getByText('downloaded')).toBeInTheDocument();
      expect(screen.getByText('missing')).toBeInTheDocument();
      expect(screen.getByText('airing')).toBeInTheDocument();
      expect(screen.getByText('unaired')).toBeInTheDocument();
    });
  });
});
