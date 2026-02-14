import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SubtitlesPage from './page';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const listMoviesMock = vi.fn();
const listMovieVariantsMock = vi.fn();
const manualSearchMock = vi.fn();
const manualDownloadMock = vi.fn();

vi.mock('@/lib/api/client', () => ({
  getApiClients: () => ({
    mediaApi: {
      listMovies: listMoviesMock,
    },
    subtitleApi: {
      listMovieVariants: listMovieVariantsMock,
      manualSearch: manualSearchMock,
      manualDownload: manualDownloadMock,
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
  beforeEach(() => {
    vi.clearAllMocks();
    listMoviesMock.mockResolvedValue({ items: [], meta: {} });
    listMovieVariantsMock.mockResolvedValue([]);
    manualSearchMock.mockResolvedValue([]);
    manualDownloadMock.mockResolvedValue({ storedPath: '/tmp/movie.en.srt' });
    vi.spyOn(window, 'alert').mockImplementation(() => undefined);
  });

  it('renders subtitle management header', async () => {
    const client = createTestQueryClient();
    render(
      <QueryClientProvider client={client}>
        <SubtitlesPage />
      </QueryClientProvider>,
    );

    expect(screen.getByText(/Subtitle Management/i)).toBeInTheDocument();
    await waitFor(() => {
        expect(screen.getByText(/No movies found/i)).toBeInTheDocument();
    });
  });

  it('supports inventory search and manual subtitle download flow', async () => {
    listMoviesMock.mockResolvedValue({
      items: [{ id: 101, title: 'The Matrix', year: 1999 }],
      meta: {},
    });
    listMovieVariantsMock.mockResolvedValue([
      {
        variantId: 501,
        path: '/data/movies/the-matrix.mkv',
        subtitleTracks: [{ languageCode: 'en', isForced: false }],
        missingSubtitles: [{ languageCode: 'es', isForced: false, isHi: false }],
      },
    ]);
    manualSearchMock.mockResolvedValue([
      {
        languageCode: 'es',
        isForced: false,
        isHi: false,
        provider: 'OpenSubtitles',
        score: 97,
        extension: '.srt',
      },
    ]);

    const client = createTestQueryClient();
    render(
      <QueryClientProvider client={client}>
        <SubtitlesPage />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('The Matrix')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Manage Subtitles' }));

    expect(await screen.findByText('Inventory for Movie #101')).toBeInTheDocument();
    expect(listMovieVariantsMock).toHaveBeenCalledWith(101);
    expect(await screen.findByText('/data/movies/the-matrix.mkv')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByText('Manual Search')).toBeInTheDocument();
    expect(await screen.findByText('OpenSubtitles')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Download' }));

    await waitFor(() => {
      expect(manualDownloadMock).toHaveBeenCalledWith({
        variantId: 501,
        candidate: expect.objectContaining({
          languageCode: 'es',
          provider: 'OpenSubtitles',
          score: 97,
        }),
      });
    });

    expect(await screen.findByText('Inventory for Movie #101')).toBeInTheDocument();
  });
});
