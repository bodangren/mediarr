import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ManualMatchDialog } from './ManualMatchDialog';
import { ToastProvider } from '@/components/providers/ToastProvider';

const mockSearchMovies = vi.fn();

vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(() => ({
    discoverApi: {
      searchMovies: mockSearchMovies,
    },
  })),
}));

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}

const mockResults = [
  {
    id: 1,
    tmdbId: 100,
    title: 'The Matrix',
    year: 1999,
    overview: 'A computer hacker learns about the true nature of reality.',
    posterUrl: 'https://example.com/matrix.jpg',
  },
  {
    id: 2,
    tmdbId: 101,
    title: 'The Matrix Reloaded',
    year: 2003,
    overview: 'Neo and the rebel leaders learn more about the Matrix and the prophecy.',
    posterUrl: undefined,
  },
];

describe('ManualMatchDialog', () => {
  const onClose = vi.fn();
  const onSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchMovies.mockResolvedValue({ results: mockResults });
  });

  it('renders search results after a search', async () => {
    const user = userEvent.setup();
    render(
      <ManualMatchDialog isOpen originalTitle="Matrix" onClose={onClose} onSelect={onSelect} />,
      { wrapper },
    );

    // The input is pre-filled with `originalTitle`; click Search to trigger the query.
    await user.click(screen.getByRole('button', { name: /Search/i }));

    await waitFor(() => {
      expect(mockSearchMovies).toHaveBeenCalledWith({ query: 'Matrix' });
    });

    expect(await screen.findByText('The Matrix')).toBeInTheDocument();
    expect(await screen.findByText('The Matrix Reloaded')).toBeInTheDocument();
    expect(screen.getByText('TMDB: 100')).toBeInTheDocument();
  });

  it('selects a match on click and closes the dialog', async () => {
    const user = userEvent.setup();
    render(
      <ManualMatchDialog isOpen originalTitle="Matrix" onClose={onClose} onSelect={onSelect} />,
      { wrapper },
    );

    const searchInput = screen.getByPlaceholderText('Search for a movie...');
    await user.clear(searchInput);
    await user.type(searchInput, 'Matrix');
    await user.click(screen.getByRole('button', { name: /Search/i }));

    const firstResult = await screen.findByText('The Matrix');
    await user.click(firstResult);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 1,
        title: 'The Matrix',
        year: 1999,
        tmdbId: 100,
      }),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onSelect with the full movie result shape when confirmed', async () => {
    const user = userEvent.setup();
    render(
      <ManualMatchDialog isOpen originalTitle="Matrix" onClose={onClose} onSelect={onSelect} />,
      { wrapper },
    );

    const searchInput = screen.getByPlaceholderText('Search for a movie...');
    await user.clear(searchInput);
    await user.type(searchInput, 'Matrix');
    await user.click(screen.getByRole('button', { name: /Search/i }));

    const secondResult = await screen.findByText('The Matrix Reloaded');
    await user.click(secondResult);

    expect(onSelect).toHaveBeenCalledTimes(1);
    const [payload] = onSelect.mock.calls[0]!;
    expect(payload).toMatchObject({
      id: 2,
      title: 'The Matrix Reloaded',
      year: 2003,
      tmdbId: 101,
    });
    expect(payload).toHaveProperty('overview');
    expect(payload).toHaveProperty('posterUrl');
  });
});
