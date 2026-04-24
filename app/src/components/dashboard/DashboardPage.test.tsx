/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { DashboardPage } from './DashboardPage';
import { getApiClients } from '@/lib/api/client';
import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from '@/components/providers/ToastProvider';

vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(),
}));

describe('DashboardPage', () => {
  let mockApi: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockApi = {
      activityApi: {
        list: vi.fn().mockResolvedValue({
          items: [
            {
              id: 1,
              eventType: 'MOVIE_IMPORTED',
              summary: 'Imported Test Movie',
              occurredAt: '2026-03-01T12:00:00.000Z',
            },
          ],
          meta: { page: 1, pageSize: 20, totalCount: 1, totalPages: 1 },
        }),
      },
      dashboardApi: {
        getUpcoming: vi.fn().mockResolvedValue([
          {
            id: 1,
            type: 'movie',
            title: 'Upcoming Movie',
            date: '2026-03-05',
            status: 'unaired',
            hasFile: false,
          },
        ]),
        getDiskSpace: vi.fn().mockResolvedValue([
          {
            path: '/data/media',
            label: 'Media',
            free: 500000000000,
            total: 1000000000000,
            usedPercent: 50,
          },
        ]),
        getContinueWatching: vi.fn().mockResolvedValue([
          {
            mediaType: 'MOVIE',
            mediaId: 10,
            seriesId: null,
            title: 'Resume Movie',
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
        ]),
      },
      torrentApi: {
        list: vi.fn().mockResolvedValue({
          items: [
            {
              infoHash: 'hash1',
              name: 'Test Torrent',
              status: 'downloading',
              progress: 0.5,
              downloadSpeed: 1000000,
              size: '1 GB',
              downloaded: '500 MB',
              uploaded: '0 MB',
            },
          ],
          meta: { page: 1, pageSize: 50, totalCount: 1, totalPages: 1 },
        }),
      },
    };
    (getApiClients as any).mockReturnValue(mockApi);
  });

  const renderPage = () =>
    render(
      <BrowserRouter>
        <ToastProvider>
          <DashboardPage />
        </ToastProvider>
      </BrowserRouter>,
    );

  it('renders dashboard with all core widgets', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText('Recently Added')).toBeInTheDocument();
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
    expect(screen.getByText('Active Downloads')).toBeInTheDocument();
    expect(screen.getByText('Disk Space')).toBeInTheDocument();
    expect(screen.getByText('Continue Watching')).toBeInTheDocument();
  });

  it('loads and displays recent activity', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Imported Test Movie')).toBeInTheDocument();
    });

    expect(mockApi.activityApi.list).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
  });

  it('loads and displays upcoming items', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Upcoming Movie')).toBeInTheDocument();
    });

    expect(mockApi.dashboardApi.getUpcoming).toHaveBeenCalled();
  });

  it('loads and displays disk space info', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Media')).toBeInTheDocument();
    });

    expect(mockApi.dashboardApi.getDiskSpace).toHaveBeenCalled();
  });

  it('loads and displays continue watching data', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Resume Movie')).toBeInTheDocument();
    });

    expect(mockApi.dashboardApi.getContinueWatching).toHaveBeenCalled();
  });

  it('loads and displays active downloads', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Test Torrent')).toBeInTheDocument();
    });

    expect(mockApi.torrentApi.list).toHaveBeenCalledWith({ page: 1, pageSize: 50 });
  });

  it('handles loading states for all widgets', async () => {
    renderPage();

    const loadingMessages = screen.getAllByText('Loading...');
    expect(loadingMessages.length).toBe(5);

    // Wait for loading to finish to avoid act() warnings from state updates
    await waitFor(() => {
      expect(screen.queryAllByText('Loading...').length).toBe(0);
    });
  });

  it('handles API errors gracefully', async () => {
    mockApi.activityApi.list.mockRejectedValue(new Error('API Error'));
    mockApi.dashboardApi.getUpcoming.mockRejectedValue(new Error('API Error'));
    mockApi.dashboardApi.getDiskSpace.mockRejectedValue(new Error('API Error'));
    mockApi.dashboardApi.getContinueWatching.mockRejectedValue(new Error('API Error'));
    mockApi.torrentApi.list.mockRejectedValue(new Error('API Error'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText('Recently Added')).toBeInTheDocument();
  });
});
