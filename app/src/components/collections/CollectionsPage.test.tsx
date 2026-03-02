import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '@/components/providers/ToastProvider';
import type { ReactNode } from 'react';
import { CollectionsPage } from './CollectionsPage';
import type { MovieCollection } from '@/types/collection';

const mockCollectionApi = {
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  search: vi.fn(),
  sync: vi.fn(),
  getById: vi.fn(),
};

const mockQualityProfileApi = {
  list: vi.fn(),
};

vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(() => ({
    collectionApi: mockCollectionApi,
    qualityProfileApi: mockQualityProfileApi,
  })),
}));

const mockCollections: MovieCollection[] = [
  {
    id: 1,
    tmdbCollectionId: 86311,
    name: 'The Avengers Collection',
    overview: 'Marvel Avengers films.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/avengers.jpg',
    movieCount: 6,
    moviesInLibrary: 5,
    monitored: true,
    qualityProfileId: 1,
    rootFolderPath: '/movies',
    minimumAvailability: 'released',
  },
  {
    id: 2,
    tmdbCollectionId: 10,
    name: 'Star Wars Collection',
    movieCount: 9,
    moviesInLibrary: 7,
    monitored: false,
  },
];

const mockQualityProfiles = [
  { id: 1, name: 'HD-1080p' },
  { id: 2, name: 'Ultra HD-4K' },
];

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 0, retry: false } },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/library/collections']}>
          <ToastProvider>
            {children}
          </ToastProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };
}

describe('CollectionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCollectionApi.list.mockResolvedValue(mockCollections);
    mockQualityProfileApi.list.mockResolvedValue(mockQualityProfiles);
  });

  it('renders the page heading', async () => {
    render(<CollectionsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/collections/i)).toBeInTheDocument();
    });
  });

  it('renders collection grid with data from API', async () => {
    render(<CollectionsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('The Avengers Collection')).toBeInTheDocument();
      expect(screen.getByText('Star Wars Collection')).toBeInTheDocument();
    });
  });

  it('renders empty state when API returns no collections', async () => {
    mockCollectionApi.list.mockResolvedValue([]);
    render(<CollectionsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/no collections/i)).toBeInTheDocument();
    });
  });

  it('shows the Add Collection button', async () => {
    render(<CollectionsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add collection/i })).toBeInTheDocument();
    });
  });

  it('opens add collection modal when Add Collection is clicked', async () => {
    const user = userEvent.setup();
    render(<CollectionsPage />, { wrapper: createWrapper() });

    await waitFor(() => screen.getByRole('button', { name: /add collection/i }));

    await user.click(screen.getByRole('button', { name: /add collection/i }));

    expect(screen.getByPlaceholderText(/tmdb collection id/i)).toBeInTheDocument();
  });

  it('calls collectionApi.delete when delete is triggered', async () => {
    mockCollectionApi.delete.mockResolvedValue({ id: 1, deleted: true });
    const user = userEvent.setup();
    render(<CollectionsPage />, { wrapper: createWrapper() });

    await waitFor(() => screen.getByLabelText('Delete The Avengers Collection'));

    await user.click(screen.getByLabelText('Delete The Avengers Collection'));

    await waitFor(() => {
      expect(mockCollectionApi.delete).toHaveBeenCalledWith(1);
    });
  });

  it('calls collectionApi.search when search is triggered', async () => {
    mockCollectionApi.search.mockResolvedValue({ id: 1, message: 'ok', searched: 1, missing: 0 });
    const user = userEvent.setup();
    render(<CollectionsPage />, { wrapper: createWrapper() });

    await waitFor(() => screen.getByLabelText('Search The Avengers Collection'));

    await user.click(screen.getByLabelText('Search The Avengers Collection'));

    await waitFor(() => {
      expect(mockCollectionApi.search).toHaveBeenCalledWith(1);
    });
  });
});
