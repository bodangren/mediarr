import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SeriesHistoryPage from './page';

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

describe('SeriesHistoryPage', () => {
  it('renders page header', () => {
    render(<SeriesHistoryPage />);

    expect(screen.getByText('Series History')).toBeInTheDocument();
    expect(screen.getByText('View subtitle download history for TV series.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear History' })).toBeInTheDocument();
  });

  it('renders history filters', () => {
    render(<SeriesHistoryPage />);

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

    render(<SeriesHistoryPage />);

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

    render(<SeriesHistoryPage />);

    expect(screen.getByText('No history found')).toBeInTheDocument();
    expect(screen.getByText('Start downloading subtitles for series to see history here.')).toBeInTheDocument();
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

    render(<SeriesHistoryPage />);

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
            type: 'series',
            seriesId: 1,
            seriesTitle: 'Test Series',
            seasonNumber: 1,
            episodeNumber: 1,
            episodeTitle: 'Test Episode',
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

    render(<SeriesHistoryPage />);

    expect(screen.getByText('Test Series')).toBeInTheDocument();
    expect(screen.getByText('S01E01')).toBeInTheDocument();
    expect(screen.getByText('en')).toBeInTheDocument();
    expect(screen.getByText('OpenSubtitles')).toBeInTheDocument();
    expect(screen.getByText('9.5')).toBeInTheDocument();
  });

  it('opens clear history modal when button is clicked', async () => {
    render(<SeriesHistoryPage />);

    const clearButton = screen.getByRole('button', { name: 'Clear History' });
    await userEvent.click(clearButton);

    expect(screen.getByText('Clear Series History')).toBeInTheDocument();
  });
});
