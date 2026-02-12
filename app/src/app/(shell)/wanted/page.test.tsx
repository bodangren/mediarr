import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { useApiQuery } from '@/lib/query/useApiQuery';
import WantedPage from './page';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(),
}));

vi.mock('@/lib/query/useApiQuery', () => ({
  useApiQuery: vi.fn(),
}));

const mockedGetApiClients = vi.mocked(getApiClients);
const mockedUseApiQuery = vi.mocked(useApiQuery);

const grabReleaseMock = vi.fn();

function renderPage(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <WantedPage />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  grabReleaseMock.mockResolvedValue({ queued: true });

  mockedGetApiClients.mockReturnValue({
    releaseApi: {
      grabRelease: grabReleaseMock,
    },
    mediaApi: {},
  } as ReturnType<typeof getApiClients>);

  mockedUseApiQuery.mockImplementation((options: { queryKey: unknown[] }) => {
    const [domain, feature] = options.queryKey;

    if (domain === 'media' && feature === 'wanted') {
      return {
        data: {
          items: [
            {
              type: 'movie',
              id: 11,
              title: 'Inception',
              year: 2010,
            },
            {
              type: 'episode',
              id: 21,
              seriesTitle: 'Andor',
              seasonNumber: 1,
              episodeNumber: 4,
            },
          ],
          meta: {
            page: 1,
            pageSize: 25,
            totalCount: 2,
            totalPages: 2,
          },
        },
        isPending: false,
        isError: false,
        isResolvedEmpty: false,
        error: null,
        refetch: vi.fn(),
      };
    }

    if (domain === 'media' && feature === 'release-candidates') {
      return {
        data: [
          {
            indexer: 'Indexer 1',
            title: 'Inception 1080p WEB-DL',
            size: 8_589_934_592,
            seeders: 145,
            quality: '1080p WEB-DL',
            age: 9,
          },
        ],
        isPending: false,
        isError: false,
        isResolvedEmpty: false,
        error: null,
        refetch: vi.fn(),
      };
    }

    return {
      data: undefined,
      isPending: false,
      isError: false,
      isResolvedEmpty: true,
      error: null,
      refetch: vi.fn(),
    };
  });
});

describe('wanted page', () => {
  it('renders unified wanted list with pagination/filter and launches release search', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    renderPage(queryClient);

    expect(await screen.findByText('Inception')).toBeInTheDocument();
    expect(screen.getByText('Andor · S1E4')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'movie' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => {
      expect(mockedUseApiQuery.mock.calls.length).toBeGreaterThan(1);
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Search' })[0]);
    expect(await screen.findByText('Release Candidates')).toBeInTheDocument();
  });

  it('renders release ranking cues and handles grab success/failure with retry', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    renderPage(queryClient);

    fireEvent.click((await screen.findAllByRole('button', { name: 'Search' }))[0]);
    expect(await screen.findByText('Indexer 1')).toBeInTheDocument();
    expect(screen.getByText('145')).toBeInTheDocument();
    expect(screen.getByText('9 d')).toBeInTheDocument();
    expect(screen.getByText('downloading')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Grab' }));
    await waitFor(() => {
      expect(grabReleaseMock).toHaveBeenCalledTimes(1);
      expect(pushMock).toHaveBeenCalledWith('/queue');
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['torrents'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['media', 'wanted'] });
    expect(await screen.findByText('Release grabbed')).toBeInTheDocument();

    grabReleaseMock.mockRejectedValueOnce(new Error('tracker rejected request'));
    fireEvent.click(screen.getByRole('button', { name: 'Grab' }));
    expect(await screen.findByText('Grab failed')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => {
      expect(grabReleaseMock).toHaveBeenCalledTimes(3);
    });
  });
});
