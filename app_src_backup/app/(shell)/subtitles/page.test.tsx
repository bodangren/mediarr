import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SubtitlesPage from './page';

// Mock the Next.js Link component
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock API clients
vi.mock('@/lib/api/client', () => ({
  getApiClients: () => ({
    subtitleWantedApi: {
      getWantedCount: () => Promise.resolve({ seriesCount: 5, moviesCount: 3, totalCount: 8 }),
    },
    subtitleHistoryApi: {
      getHistoryStats: () => Promise.resolve({
        period: 'month',
        downloads: [
          { date: '2024-01-01', series: 2, movies: 1 },
          { date: '2024-01-02', series: 1, movies: 0 },
        ],
        byProvider: [],
        byLanguage: [],
      }),
    },
  }),
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

describe('SubtitlesPage', () => {
  const renderPage = () => {
    const client = createTestQueryClient();
    return render(
      <QueryClientProvider client={client}>
        <SubtitlesPage />
      </QueryClientProvider>
    );
  };

  it('renders page with header', () => {
    renderPage();
    expect(screen.getByText('Subtitles')).toBeInTheDocument();
    expect(
      screen.getByText('Manage subtitle downloads, search history, language profiles, and provider settings.')
    ).toBeInTheDocument();
  });

  it('renders quick stats section', async () => {
    renderPage();
    expect(await screen.findByText('Wanted Episodes')).toBeInTheDocument();
    expect(await screen.findByText('Wanted Movies')).toBeInTheDocument();
    expect(await screen.findByText('Total Wanted')).toBeInTheDocument();
    expect(await screen.findByText('Downloaded')).toBeInTheDocument();
  });

  it('displays wanted counts', async () => {
    renderPage();
    expect(await screen.findByText('5')).toBeInTheDocument(); // seriesCount
    expect(await screen.findByText('3')).toBeInTheDocument(); // moviesCount
    expect(await screen.findByText('8')).toBeInTheDocument(); // totalCount
  });

  it('renders quick links section', () => {
    renderPage();
    expect(screen.getByText('Series Subtitles')).toBeInTheDocument();
    expect(screen.getByText('Movies Subtitles')).toBeInTheDocument();
    expect(screen.getByText('Wanted Episodes')).toBeInTheDocument();
    expect(screen.getByText('Wanted Movies')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
    expect(screen.getByText('Blacklist')).toBeInTheDocument();
  });

  it('renders configuration section', () => {
    renderPage();
    expect(screen.getByText('Configuration')).toBeInTheDocument();
    expect(screen.getByText('Language Profiles')).toBeInTheDocument();
    expect(screen.getByText('Providers')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('has links to subtitle pages', () => {
    renderPage();
    const seriesLink = screen.getByText('Series Subtitles').closest('a');
    const moviesLink = screen.getByText('Movies Subtitles').closest('a');
    const profilesLink = screen.getByText('Language Profiles').closest('a');

    expect(seriesLink?.getAttribute('href')).toBe('/subtitles/series');
    expect(moviesLink?.getAttribute('href')).toBe('/subtitles/movies');
    expect(profilesLink?.getAttribute('href')).toBe('/subtitles/profiles');
  });

  it('has link to subtitle settings', () => {
    renderPage();
    const settingsLink = screen.getByText('Settings', { selector: 'a' });
    expect(settingsLink).toBeInTheDocument();
  });
});
