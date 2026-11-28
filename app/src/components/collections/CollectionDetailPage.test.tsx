import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '@/components/providers/ToastProvider';
import type { ReactNode } from 'react';
import { CollectionDetailPage } from './CollectionDetailPage';
import type { MovieCollection } from '@/types/collection';

const mockCollectionApi = {
  getById: vi.fn(),
  search: vi.fn(),
  sync: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(() => ({
    collectionApi: mockCollectionApi,
  })),
}));

const mockCollection: MovieCollection = {
  id: 5,
  tmdbCollectionId: 86311,
  name: 'The Avengers Collection',
  overview: 'Earth\'s mightiest heroes.',
  posterUrl: 'https://image.tmdb.org/t/p/w500/avengers.jpg',
  backdropUrl: 'https://image.tmdb.org/t/p/original/backdrop.jpg',
  movieCount: 3,
  moviesInLibrary: 2,
  monitored: true,
  movies: [
    {
      id: 101,
      tmdbId: 24428,
      title: 'The Avengers',
      year: 2012,
      inLibrary: true,
      status: 'released',
      posterUrl: 'https://image.tmdb.org/t/p/w92/avengers1.jpg',
    },
    {
      id: 102,
      tmdbId: 99861,
      title: 'Avengers: Age of Ultron',
      year: 2015,
      inLibrary: true,
      status: 'released',
    },
    {
      id: 103,
      tmdbId: 271110,
      title: 'Avengers: Infinity War',
      year: 2018,
      inLibrary: false,
      status: 'released',
    },
  ],
};

function createWrapper(id = '5') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 0, retry: false } },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/library/collections/${id}`]}>
          <ToastProvider>
            <Routes>
              <Route path="/library/collections/:id" element={children} />
            </Routes>
          </ToastProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };
}

describe('CollectionDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCollectionApi.getById.mockResolvedValue(mockCollection);
  });

  it('renders collection header with title', async () => {
    render(<CollectionDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('The Avengers Collection')).toBeInTheDocument();
    });
  });

  it('renders collection overview', async () => {
    render(<CollectionDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Earth's mightiest heroes.")).toBeInTheDocument();
    });
  });

  it('renders X of Y in library badge', async () => {
    render(<CollectionDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/2 of 3 in library/i)).toBeInTheDocument();
    });
  });

  it('renders all movie rows', async () => {
    render(<CollectionDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('The Avengers')).toBeInTheDocument();
      expect(screen.getByText('Avengers: Age of Ultron')).toBeInTheDocument();
      expect(screen.getByText('Avengers: Infinity War')).toBeInTheDocument();
    });
  });

  it('shows In Library badge for movies in library', async () => {
    render(<CollectionDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      const badges = screen.getAllByText('In Library');
      expect(badges).toHaveLength(2);
    });
  });

  it('shows Missing badge for movies not in library', async () => {
    render(<CollectionDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Missing')).toBeInTheDocument();
    });
  });

  it('offers the missing parts through the collection actions menu', async () => {
    render(<CollectionDetailPage />, { wrapper: createWrapper() });

    expect(await screen.findByText('Request missing parts')).toBeInTheDocument();
    expect(screen.getByText('Sync from TMDB')).toBeInTheDocument();
    expect(document.querySelector('summary[aria-label="Collection actions"]')).not.toBeNull();
  });

  it('requests the missing parts when the menu action is used', async () => {
    mockCollectionApi.search.mockResolvedValue({ id: 5, message: 'ok', searched: 1, missing: 1, monitored: 1, created: 0, total: 3 });
    render(<CollectionDetailPage />, { wrapper: createWrapper() });

    fireEvent.click(await screen.findByText('Request missing parts'));

    await waitFor(() => expect(mockCollectionApi.search).toHaveBeenCalledWith(5));
  });

  it('calls collectionApi.sync when Sync from TMDB is used from the menu', async () => {
    mockCollectionApi.sync.mockResolvedValue({ id: 5, message: 'ok', added: 1, updated: 0 });
    render(<CollectionDetailPage />, { wrapper: createWrapper() });

    fireEvent.click(await screen.findByText('Sync from TMDB'));

    await waitFor(() => {
      expect(mockCollectionApi.sync).toHaveBeenCalledWith(5);
    });
  });
});
