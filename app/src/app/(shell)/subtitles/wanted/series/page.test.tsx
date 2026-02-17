import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WantedSeriesPage from './page';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';

// Mock dependencies
vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(() => ({
    subtitleWantedApi: {
      listWantedSeries: vi.fn(),
      searchAllSeries: vi.fn(),
      searchSeriesItem: vi.fn(),
      getWantedCount: vi.fn(),
    },
  })),
}));

vi.mock('@/components/providers/ToastProvider', () => ({
  useToast: vi.fn(() => ({
    pushToast: vi.fn(),
  })),
}));

vi.mock('@/components/subtitles/LanguageBadge', () => ({
  LanguageBadge: ({ languageCode, variant, onClick }: any) => (
    <button
      type="button"
      onClick={onClick}
      data-testid={`language-badge-${languageCode}`}
      className={`language-badge language-badge-${variant}`}
    >
      {languageCode}
    </button>
  ),
}));

vi.mock('@/components/subtitles/SearchProgressIndicator', () => ({
  SearchProgressIndicator: ({ isSearching }: any) =>
    isSearching ? <div data-testid="search-progress">Searching...</div> : null,
}));

vi.mock('@/components/subtitles/WantedCountBadge', () => ({
  WantedCountBadge: () => <span data-testid="wanted-count">5</span>,
}));

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('WantedSeriesPage', () => {
  it('should render page header', () => {
    renderWithProviders(<WantedSeriesPage />);

    expect(screen.getByText('Wanted Episodes')).toBeInTheDocument();
    expect(screen.getByText('Episodes with missing subtitle tracks')).toBeInTheDocument();
    expect(screen.getByText('Search All')).toBeInTheDocument();
  });

  it('should show wanted count badge', () => {
    renderWithProviders(<WantedSeriesPage />);

    expect(screen.getByTestId('wanted-count')).toBeInTheDocument();
  });

  it('should render search input and language filter', () => {
    renderWithProviders(<WantedSeriesPage />);

    expect(
      screen.getByPlaceholderText('Search series or episode title...')
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. en, es, fr')).toBeInTheDocument();
  });

  it('should handle search input change', async () => {
    renderWithProviders(<WantedSeriesPage />);

    const searchInput = screen.getByPlaceholderText('Search series or episode title...');
    fireEvent.change(searchInput, { target: { value: 'test search' } });

    await waitFor(() => {
      expect(searchInput).toHaveValue('test search');
    });
  });

  it('should handle language filter change', async () => {
    renderWithProviders(<WantedSeriesPage />);

    const languageInput = screen.getByPlaceholderText('e.g. en, es, fr');
    fireEvent.change(languageInput, { target: { value: 'en' } });

    await waitFor(() => {
      expect(languageInput).toHaveValue('en');
    });
  });

  it('should render language badges', async () => {
    const { getApiClients } = await import('@/lib/api/client');

    const mockListWantedSeries = vi.fn().mockResolvedValue({
      items: [
        {
          seriesId: 1,
          seriesTitle: 'Test Series',
          seasonNumber: 1,
          episodeNumber: 1,
          episodeId: 101,
          episodeTitle: 'Pilot',
          missingLanguages: ['en', 'es'],
        },
      ],
      meta: { totalCount: 1 },
    });

    getApiClients().subtitleWantedApi.listWantedSeries = mockListWantedSeries;

    renderWithProviders(<WantedSeriesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('language-badge-en')).toBeInTheDocument();
      expect(screen.getByTestId('language-badge-es')).toBeInTheDocument();
    });
  });

  it('should show empty state when no results', () => {
    const { getApiClients } = require('@/lib/api/client');

    getApiClients().subtitleWantedApi.listWantedSeries = vi.fn().mockResolvedValue({
      items: [],
      meta: { totalCount: 0 },
    });

    renderWithProviders(<WantedSeriesPage />);

    expect(screen.getByText('No missing subtitles')).toBeInTheDocument();
  });
});
