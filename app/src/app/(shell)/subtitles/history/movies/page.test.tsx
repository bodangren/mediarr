import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MoviesHistoryPage from './page';

// Mock dependencies
vi.mock('@/lib/api/client', () => ({
  getApiClients: () => ({
    subtitleHistoryApi: {
      listHistory: vi.fn(),
      clearHistory: vi.fn(),
    },
  }),
}));

vi.mock('@/lib/query/useApiQuery', () => ({
  useApiQuery: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
}));

describe('MoviesHistoryPage', () => {
  it('renders page header', () => {
    render(<MoviesHistoryPage />);

    expect(screen.getByText('Movies History')).toBeInTheDocument();
    expect(screen.getByText('View subtitle download history for movies.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear History' })).toBeInTheDocument();
  });

  it('renders history filters', () => {
    render(<MoviesHistoryPage />);

    expect(screen.getByLabelText('Provider')).toBeInTheDocument();
    expect(screen.getByLabelText('Language')).toBeInTheDocument();
    expect(screen.getByLabelText('Action')).toBeInTheDocument();
    expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
    expect(screen.getByLabelText('End Date')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    const { useApiQuery } = require('@/lib/query/useApiQuery');
    useApiQuery.mockReturnValue({
      isPending: true,
      isError: false,
      isResolvedEmpty: false,
      data: undefined,
      refetch: vi.fn(),
    });

    render(<MoviesHistoryPage />);

    expect(screen.queryByText('No history found')).not.toBeInTheDocument();
  });

  it('shows empty state', () => {
    const { useApiQuery } = require('@/lib/query/useApiQuery');
    useApiQuery.mockReturnValue({
      isPending: false,
      isError: false,
      isResolvedEmpty: true,
      data: { items: [], meta: { page: 1, pageSize: 25, totalCount: 0, totalPages: 0 } },
      refetch: vi.fn(),
    });

    render(<MoviesHistoryPage />);

    expect(screen.getByText('No history found')).toBeInTheDocument();
    expect(screen.getByText('Start downloading subtitles for movies to see history here.')).toBeInTheDocument();
  });

  it('shows error state', () => {
    const { useApiQuery } = require('@/lib/query/useApiQuery');
    useApiQuery.mockReturnValue({
      isPending: false,
      isError: true,
      isResolvedEmpty: false,
      error: { message: 'Failed to load history' },
      refetch: vi.fn(),
    });

    render(<MoviesHistoryPage />);

    expect(screen.getByText('Could not load data')).toBeInTheDocument();
  });

  it('renders history table when data is available', () => {
    const { useApiQuery } = require('@/lib/query/useApiQuery');
    useApiQuery.mockReturnValue({
      isPending: false,
      isError: false,
      isResolvedEmpty: false,
      data: {
        items: [
          {
            id: 1,
            type: 'movie',
            movieId: 1,
            movieTitle: 'Test Movie',
            episodeTitle: 'Test Movie (2024)',
            languageCode: 'en',
            provider: 'OpenSubtitles',
            score: 9.5,
            action: 'download',
            timestamp: new Date().toISOString(),
          },
        ],
        meta: { page: 1, pageSize: 25, totalCount: 1, totalPages: 1 },
      },
      refetch: vi.fn(),
    });

    render(<MoviesHistoryPage />);

    expect(screen.getByText('Test Movie')).toBeInTheDocument();
    expect(screen.getByText('en')).toBeInTheDocument();
    expect(screen.getByText('OpenSubtitles')).toBeInTheDocument();
    expect(screen.getByText('9.5')).toBeInTheDocument();
  });

  it('opens clear history modal when button is clicked', async () => {
    render(<MoviesHistoryPage />);

    const clearButton = screen.getByRole('button', { name: 'Clear History' });
    await userEvent.click(clearButton);

    expect(screen.getByText('Clear Movies History')).toBeInTheDocument();
  });
});
