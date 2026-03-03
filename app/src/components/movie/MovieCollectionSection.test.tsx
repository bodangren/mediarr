import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MovieCollectionSection } from './MovieCollectionSection';
import { ToastProvider } from '@/components/providers/ToastProvider';

const mockTmdbCollection = vi.fn();
const mockCreate = vi.fn();
const mockSync = vi.fn();

vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(() => ({
    movieApi: { getTmdbCollection: mockTmdbCollection },
    collectionApi: { create: mockCreate, sync: mockSync },
  })),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 0, retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ToastProvider>{children}</ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('MovieCollectionSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders existing collection as a link when already linked', () => {
    render(
      <MovieCollectionSection
        movieId={1}
        tmdbId={27205}
        collection={{ id: 42, name: 'Christopher Nolan Collection' }}
      />,
      { wrapper },
    );

    const link = screen.getByRole('link', { name: 'Christopher Nolan Collection' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/library/collections/42');
  });

  it('detects collection from TMDB when no collection is linked', async () => {
    mockTmdbCollection.mockResolvedValue({
      collection: { tmdbCollectionId: 87359, name: 'John Wick Collection', posterUrl: null },
    });

    render(
      <MovieCollectionSection movieId={1} tmdbId={245891} collection={null} />,
      { wrapper },
    );

    await waitFor(() => {
      expect(screen.getByText('John Wick Collection')).toBeInTheDocument();
    });

    expect(mockTmdbCollection).toHaveBeenCalledWith(1);
    expect(screen.getByRole('button', { name: /add to library/i })).toBeInTheDocument();
  });

  it('renders nothing when movie has no tmdbId', () => {
    render(
      <MovieCollectionSection movieId={1} tmdbId={undefined} collection={null} />,
      { wrapper },
    );

    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expect(mockTmdbCollection).not.toHaveBeenCalled();
  });

  it('renders nothing when TMDB returns no collection', async () => {
    mockTmdbCollection.mockResolvedValue({ collection: null });

    render(
      <MovieCollectionSection movieId={1} tmdbId={99999} collection={null} />,
      { wrapper },
    );

    await waitFor(() => {
      expect(mockTmdbCollection).toHaveBeenCalled();
    });

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('shows monitor toggle and add button when collection detected', async () => {
    mockTmdbCollection.mockResolvedValue({
      collection: { tmdbCollectionId: 87359, name: 'John Wick Collection', posterUrl: null },
    });

    render(
      <MovieCollectionSection movieId={1} tmdbId={245891} collection={null} />,
      { wrapper },
    );

    await waitFor(() => {
      expect(screen.getByText('John Wick Collection')).toBeInTheDocument();
    });

    expect(screen.getByRole('checkbox', { name: /monitor collection/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add to library/i })).toBeInTheDocument();
  });

  it('calls create then sync when Add to Library is clicked', async () => {
    mockTmdbCollection.mockResolvedValue({
      collection: { tmdbCollectionId: 87359, name: 'John Wick Collection', posterUrl: null },
    });
    mockCreate.mockResolvedValue({ id: 5, name: 'John Wick Collection', moviesAdded: 0 });
    mockSync.mockResolvedValue({ added: 3, updated: 1 });

    render(
      <MovieCollectionSection movieId={1} tmdbId={245891} collection={null} />,
      { wrapper },
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add to library/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /add to library/i }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({ tmdbCollectionId: 87359, monitored: false });
      expect(mockSync).toHaveBeenCalledWith(5);
    });
  });

  it('passes monitored=true when monitor toggle is checked before adding', async () => {
    mockTmdbCollection.mockResolvedValue({
      collection: { tmdbCollectionId: 87359, name: 'John Wick Collection', posterUrl: null },
    });
    mockCreate.mockResolvedValue({ id: 5, name: 'John Wick Collection', moviesAdded: 0 });
    mockSync.mockResolvedValue({ added: 3, updated: 1 });

    render(
      <MovieCollectionSection movieId={1} tmdbId={245891} collection={null} />,
      { wrapper },
    );

    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: /monitor collection/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('checkbox', { name: /monitor collection/i }));
    fireEvent.click(screen.getByRole('button', { name: /add to library/i }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({ tmdbCollectionId: 87359, monitored: true });
    });
  });
});
