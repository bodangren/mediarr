import { describe, it, expect, beforeEach, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MovieHistory } from './MovieHistory';
import * as activityApi from '@/lib/api/activityApi';

// Mock the activity API
vi.mock('@/lib/api/activityApi', () => ({
  createActivityApi: vi.fn(() => ({
    list: vi.fn(),
  })),
}));

describe('MovieHistory', () => {
  const mockActivityApi = {
    list: vi.fn(),
  };

  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { staleTime: 0, retry: false },
      },
    });

    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (activityApi.createActivityApi as any).mockReturnValue(mockActivityApi);
  });

  it('should display history events', async () => {
    mockActivityApi.list.mockResolvedValue({
      items: [
        {
          id: 1,
          eventType: 'RELEASE_GRABBED',
          sourceModule: 'MediaSearchService',
          entityRef: 'movie:123',
          summary: 'Release grabbed: Test.Release.2024.1080p',
          success: true,
          details: { quality: '1080p' },
          occurredAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 2,
          eventType: 'IMPORT_COMPLETED',
          sourceModule: 'ImportService',
          entityRef: 'movie:123',
          summary: 'Movie imported successfully',
          success: true,
          occurredAt: new Date(Date.now() - 7200000).toISOString(),
        },
      ],
      meta: {
        page: 1,
        pageSize: 50,
        totalCount: 2,
        totalPages: 1,
      },
    });

    render(<MovieHistory movieId={123} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText('History')).toBeInTheDocument();
      expect(screen.getByText('grab')).toBeInTheDocument();
      expect(screen.getByText('import')).toBeInTheDocument();
    });
  });

  it('should display empty state when no history', async () => {
    mockActivityApi.list.mockResolvedValue({
      items: [],
      meta: {
        page: 1,
        pageSize: 50,
        totalCount: 0,
        totalPages: 0,
      },
    });

    render(<MovieHistory movieId={123} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText('History')).toBeInTheDocument();
      expect(screen.getByText('No history yet')).toBeInTheDocument();
      expect(screen.getByText('Activity events for this movie will appear here.')).toBeInTheDocument();
    });
  });

  it('should display error state on fetch failure', async () => {
    mockActivityApi.list.mockRejectedValue(new Error('Failed to fetch history'));

    render(<MovieHistory movieId={123} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText('History')).toBeInTheDocument();
      expect(screen.getByText(/Could not load data/)).toBeInTheDocument();
    });
  });
});
