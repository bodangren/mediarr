import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HistoryStatsPage from './page';

// Mock dependencies
vi.mock('@/lib/api/client', () => ({
  getApiClients: () => ({
    subtitleHistoryApi: {
      getHistoryStats: vi.fn(),
    },
  }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

describe('HistoryStatsPage', () => {
  it('renders page header', () => {
    const { useQuery } = require('@tanstack/react-query');
    useQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        period: 'month',
        downloads: [],
        byProvider: [],
        byLanguage: [],
      },
    });

    render(<HistoryStatsPage />);

    expect(screen.getByText('Subtitle History Statistics')).toBeInTheDocument();
    expect(screen.getByText('Visualize subtitle download trends and patterns.')).toBeInTheDocument();
  });

  it('renders time frame buttons', () => {
    const { useQuery } = require('@tanstack/react-query');
    useQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        period: 'month',
        downloads: [],
        byProvider: [],
        byLanguage: [],
      },
    });

    render(<HistoryStatsPage />);

    expect(screen.getByRole('button', { name: 'day' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'week' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'month' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'year' })).toBeInTheDocument();
  });

  it('renders history filters', () => {
    const { useQuery } = require('@tanstack/react-query');
    useQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        period: 'month',
        downloads: [],
        byProvider: [],
        byLanguage: [],
      },
    });

    render(<HistoryStatsPage />);

    expect(screen.getByLabelText('Provider')).toBeInTheDocument();
    expect(screen.getByLabelText('Language')).toBeInTheDocument();
    expect(screen.getByLabelText('Action')).toBeInTheDocument();
    expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
    expect(screen.getByLabelText('End Date')).toBeInTheDocument();
  });

  it('renders metric cards', () => {
    const { useQuery } = require('@tanstack/react-query');
    useQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        period: 'month',
        downloads: [
          { date: '2026-02-01', series: 10, movies: 5 },
          { date: '2026-02-02', series: 8, movies: 3 },
        ],
        byProvider: [
          { provider: 'OpenSubtitles', count: 15 },
          { provider: 'Subscene', count: 10 },
        ],
        byLanguage: [
          { language: 'en', count: 20 },
          { language: 'es', count: 5 },
        ],
      },
    });

    render(<HistoryStatsPage />);

    expect(screen.getByText('Total Downloads')).toBeInTheDocument();
    expect(screen.getByText('This month')).toBeInTheDocument();
    expect(screen.getByText('Top Provider')).toBeInTheDocument();
    expect(screen.getByText('Top Language')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    const { useQuery } = require('@tanstack/react-query');
    useQuery.mockReturnValue({
      isLoading: true,
      isError: false,
      data: undefined,
    });

    render(<HistoryStatsPage />);

    expect(screen.queryByText('No statistics available')).not.toBeInTheDocument();
  });

  it('shows empty state', () => {
    const { useQuery } = require('@tanstack/react-query');
    useQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        period: 'month',
        downloads: [],
        byProvider: [],
        byLanguage: [],
      },
    });

    render(<HistoryStatsPage />);

    expect(screen.getByText('No statistics available')).toBeInTheDocument();
    expect(screen.getByText('There is no subtitle download data to display for the selected period.')).toBeInTheDocument();
  });

  it('shows error state', () => {
    const { useQuery } = require('@tanstack/react-query');
    useQuery.mockReturnValue({
      isLoading: false,
      isError: true,
      error: { message: 'Failed to load statistics' },
      data: undefined,
    });

    render(<HistoryStatsPage />);

    expect(screen.getByText('Could not load data')).toBeInTheDocument();
  });

  it('renders chart when data is available', () => {
    const { useQuery } = require('@tanstack/react-query');
    useQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        period: 'month',
        downloads: [
          { date: '2026-02-01', series: 10, movies: 5 },
          { date: '2026-02-02', series: 8, movies: 3 },
        ],
        byProvider: [],
        byLanguage: [],
      },
    });

    render(<HistoryStatsPage />);

    expect(screen.getByText('Download Trends')).toBeInTheDocument();
  });

  it('renders top providers section', () => {
    const { useQuery } = require('@tanstack/react-query');
    useQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        period: 'month',
        downloads: [],
        byProvider: [
          { provider: 'OpenSubtitles', count: 15 },
          { provider: 'Subscene', count: 10 },
          { provider: 'Addic7ed', count: 5 },
        ],
        byLanguage: [],
      },
    });

    render(<HistoryStatsPage />);

    expect(screen.getByText('Top Providers')).toBeInTheDocument();
    expect(screen.getByText('OpenSubtitles')).toBeInTheDocument();
    expect(screen.getByText('Subscene')).toBeInTheDocument();
  });

  it('renders top languages section', () => {
    const { useQuery } = require('@tanstack/react-query');
    useQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        period: 'month',
        downloads: [],
        byProvider: [],
        byLanguage: [
          { language: 'en', count: 20 },
          { language: 'es', count: 15 },
          { language: 'fr', count: 10 },
        ],
      },
    });

    render(<HistoryStatsPage />);

    expect(screen.getByText('Top Languages')).toBeInTheDocument();
    expect(screen.getByText('en')).toBeInTheDocument();
    expect(screen.getByText('es')).toBeInTheDocument();
  });

  it('changes time frame when button is clicked', async () => {
    const { useQuery } = require('@tanstack/react-query');
    useQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        period: 'month',
        downloads: [],
        byProvider: [],
        byLanguage: [],
      },
    });

    render(<HistoryStatsPage />);

    const weekButton = screen.getByRole('button', { name: 'week' });
    await userEvent.click(weekButton);

    expect(weekButton).toHaveClass('border-accent-primary bg-accent-primary');
  });
});
