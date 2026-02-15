import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getApiClients } from '@/lib/api/client';
import HistoryPage from './page';

vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(),
}));

const mockedGetApiClients = vi.mocked(getApiClients);
const listActivityMock = vi.fn();

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
      },
    },
  });
}

function renderPage(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <HistoryPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();

  listActivityMock.mockImplementation(async (query?: { page?: number; pageSize?: number; eventType?: string }) => {
    const page = query?.page ?? 1;
    const pageSize = query?.pageSize ?? 25;

    if (query?.eventType === 'RELEASE_GRABBED') {
      return {
        items: [
          {
            id: 99,
            eventType: 'RELEASE_GRABBED',
            summary: 'Grabbed release from Indexer A',
            sourceModule: 'prowlarr',
            success: undefined,
            occurredAt: '2026-02-15T09:00:00.000Z',
          },
        ],
        meta: {
          page,
          pageSize,
          totalCount: 1,
          totalPages: 1,
        },
      };
    }

    if (page === 2) {
      return {
        items: [
          {
            id: 2,
            eventType: 'INDEXER_QUERY',
            summary: 'Second page query event',
            sourceModule: 'prowlarr',
            success: true,
            occurredAt: '2026-02-15T08:00:00.000Z',
          },
        ],
        meta: {
          page,
          pageSize,
          totalCount: 2,
          totalPages: 2,
        },
      };
    }

    return {
      items: [
        {
          id: 1,
          eventType: 'INDEXER_QUERY',
          summary: 'Initial indexer query executed',
          sourceModule: 'prowlarr',
          entityRef: 'movie:42',
          details: {
            query: 'Dune Part Two',
            indexer: 'Indexer A',
            category: 2000,
          },
          success: true,
          occurredAt: '2026-02-15T10:00:00.000Z',
        },
        {
          id: 3,
          eventType: 'INDEXER_AUTH',
          summary: 'Authentication failed for private indexer',
          entityRef: 'indexer:7',
          details: {
            reason: 'Invalid API key',
          },
          success: false,
          occurredAt: '2026-02-15T07:30:00.000Z',
        },
      ],
      meta: {
        page,
        pageSize,
        totalCount: 2,
        totalPages: 2,
      },
    };
  });

  mockedGetApiClients.mockReturnValue({
    activityApi: {
      list: listActivityMock,
    },
  } as ReturnType<typeof getApiClients>);
});

describe('history page', () => {
  it('renders paginated history table from activity API', async () => {
    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    expect(screen.getByRole('heading', { name: 'History' })).toBeInTheDocument();

    await waitFor(() => {
      expect(listActivityMock).toHaveBeenCalledWith({ page: 1, pageSize: 25 });
    });

    expect(await screen.findByText('Initial indexer query executed')).toBeInTheDocument();
    expect(screen.getByText('INDEXER_QUERY')).toBeInTheDocument();
    expect(screen.getByText('Authentication failed for private indexer')).toBeInTheDocument();
    expect(screen.getByText('failed')).toBeInTheDocument();
    expect(screen.getByText('core')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
  });

  it('filters by event type', async () => {
    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    await screen.findByText('Initial indexer query executed');

    fireEvent.change(screen.getByLabelText('Event type'), { target: { value: 'RELEASE_GRABBED' } });

    await waitFor(() => {
      expect(listActivityMock).toHaveBeenCalledWith({
        page: 1,
        pageSize: 25,
        eventType: 'RELEASE_GRABBED',
      });
    });

    expect(await screen.findByText('Grabbed release from Indexer A')).toBeInTheDocument();
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
  });

  it('supports pagination controls', async () => {
    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    await screen.findByText('Initial indexer query executed');

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));

    await waitFor(() => {
      expect(listActivityMock).toHaveBeenCalledWith({ page: 2, pageSize: 25 });
    });

    expect(await screen.findByText('Second page query event')).toBeInTheDocument();
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));

    await waitFor(() => {
      expect(listActivityMock).toHaveBeenCalledWith({ page: 1, pageSize: 25 });
    });
  });

  it('supports page size changes and resets to first page', async () => {
    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    await screen.findByText('Initial indexer query executed');

    fireEvent.change(screen.getByLabelText('Page size'), { target: { value: '50' } });

    await waitFor(() => {
      expect(listActivityMock).toHaveBeenCalledWith({ page: 1, pageSize: 50 });
    });
  });

  it('opens details modal with parameter payload and status indicators', async () => {
    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    await screen.findByText('Initial indexer query executed');

    fireEvent.click(screen.getByRole('button', { name: 'Details for Initial indexer query executed' }));

    const dialog = await screen.findByRole('dialog', { name: 'History details' });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('movie:42')).toBeInTheDocument();
    expect(within(dialog).getByText(/Dune Part Two/)).toBeInTheDocument();
    expect(within(dialog).getByText('success')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close details' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'History details' })).not.toBeInTheDocument();
    });
  });
});
