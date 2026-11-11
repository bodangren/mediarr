/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { WantedPage } from './WantedPage';
import { getApiClients } from '@/lib/api/client';
import { createWantedManageApi } from '@/lib/api/wantedManageApi';

vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(),
}));

vi.mock('@/lib/api/wantedManageApi', () => ({
  createWantedManageApi: vi.fn(),
  WANTED_FETCH_LIMIT: 10_000,
}));

const wantedMedia = [
  {
    type: 'movie' as const,
    id: 101,
    tmdbId: 693134,
    title: 'Dune: Part Two',
    year: 2024,
    status: 'Released',
    monitored: true,
    addedAt: '2024-06-01T00:00:00.000Z',
    priority: { bucket: 'continue-watching' as const, rank: 0 },
  },
  {
    type: 'movie' as const,
    id: 102,
    tmdbId: 792307,
    title: 'Poor Things',
    year: 2023,
    status: 'Announced',
    monitored: true,
    addedAt: '2024-01-01T00:00:00.000Z',
    priority: { bucket: 'backfill' as const, rank: 3 },
  },
  {
    type: 'episode' as const,
    id: 10,
    seriesId: 1001,
    seasonNumber: 2,
    episodeNumber: 1,
    title: 'Hello, Ms. Cobel',
    seriesTitle: 'Severance',
    monitored: true,
    airDateUtc: '2025-01-17T00:00:00.000Z',
    addedAt: '2025-01-01T00:00:00.000Z',
    priority: { bucket: 'recently-added' as const, rank: 2 },
  },
];

const priorityCoverage = {
  days: 14,
  counts: { dual: 1, 'zho-only': 1, 'en-only': 0, none: 1 },
  total: 3,
  items: [
    { mediaType: 'EPISODE', mediaId: 4771, title: 'The Beating', status: 'dual', languages: ['en', 'zho'] },
    { mediaType: 'EPISODE', mediaId: 495, title: 'Nellis', status: 'zho-only', languages: ['zho'] },
    {
      mediaType: 'MOVIE',
      mediaId: 567,
      title: 'Winter Spring Summer or Fall',
      status: 'none',
      languages: [],
    },
  ],
};

const subtitleCoverage = {
  buckets: [],
  totals: { total: 0, withChinese: 0, withEnglish: 0, withBoth: 0, missingChinese: 0, missingBoth: 0 },
  highPriority: { total: 0, covered: 0, missing: 0 },
};

const wantedSubtitleMovies = [
  {
    movieId: 382,
    movieTitle: 'The Avengers',
    year: 2012,
    missingLanguages: ['en'],
    addedAt: '2026-08-15T12:52:54.000Z',
    priority: { bucket: 'continue-watching' as const, rank: 0 },
  },
  {
    movieId: 547,
    movieTitle: 'X-Men: Apocalypse',
    year: 2016,
    missingLanguages: ['en'],
    addedAt: '2026-08-15T12:53:51.000Z',
    priority: { bucket: 'backfill' as const, rank: 3 },
  },
];

const wantedSubtitleSeries = [
  {
    seriesId: 11,
    seriesTitle: 'Entourage',
    seasonNumber: 1,
    episodeNumber: 1,
    episodeId: 321,
    episodeTitle: 'Entourage',
    missingLanguages: ['en'],
    addedAt: '2026-08-16T23:59:02.000Z',
    priority: { bucket: 'continue-watching' as const, rank: 0 },
  },
];

const disabledProviders = [
  { id: 'opensubtitles', name: 'OpenSubtitles', enabled: false, type: 'api', settings: {}, status: 'disabled' },
  { id: 'assrt', name: 'ASSRT', enabled: false, type: 'api', settings: {}, status: 'disabled' },
];

function makeManage() {
  return {
    listMediaWanted: vi.fn().mockResolvedValue({
      items: wantedMedia,
      meta: { page: 1, pageSize: 10_000, totalCount: wantedMedia.length, totalPages: 1 },
    }),
    searchMediaItem: vi.fn().mockResolvedValue({ success: true, release: { title: 'Dune.2024.1080p' } }),
    searchAllMedia: vi.fn().mockResolvedValue({ message: 'Background search triggered for all wanted media' }),
    listSubtitleWantedMovies: vi.fn().mockResolvedValue({
      items: wantedSubtitleMovies,
      meta: { page: 1, pageSize: 10_000, totalCount: wantedSubtitleMovies.length, totalPages: 1 },
    }),
    listSubtitleWantedSeries: vi.fn().mockResolvedValue({
      items: wantedSubtitleSeries,
      meta: { page: 1, pageSize: 10_000, totalCount: wantedSubtitleSeries.length, totalPages: 1 },
    }),
    searchSubtitleMovieItem: vi.fn().mockResolvedValue({ triggered: true, movieId: 382, languageCode: 'en' }),
    searchSubtitleSeriesItem: vi.fn().mockResolvedValue({ triggered: true, seriesId: 11, languageCode: 'en' }),
    searchAllSubtitleMovies: vi.fn().mockResolvedValue({ triggered: true, count: 0 }),
    searchAllSubtitleSeries: vi.fn().mockResolvedValue({ triggered: true, count: 0 }),
    getSubtitleCoverage: vi.fn().mockResolvedValue(subtitleCoverage),
    getPriorityCoverage: vi.fn().mockResolvedValue(priorityCoverage),
  };
}

describe('WantedPage', () => {
  let manage: ReturnType<typeof makeManage>;
  let clients: any;

  beforeEach(() => {
    vi.clearAllMocks();
    manage = makeManage();
    (createWantedManageApi as any).mockReturnValue(manage);
    clients = {
      httpClient: {},
      indexerApi: { list: vi.fn().mockResolvedValue([{ id: 1 }]) },
      subtitleProvidersApi: { listProviders: vi.fn().mockResolvedValue(disabledProviders) },
    };
    (getApiClients as any).mockReturnValue(clients);
  });

  const renderPage = () =>
    render(
      <BrowserRouter>
        <WantedPage />
      </BrowserRouter>,
    );

  const openSubtitles = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole('tab', { name: 'Subtitles wanted' }));
    await screen.findByText('Missing subtitles (3)');
  };

  it('renders the manage tabs and loads wanted media on mount', async () => {
    renderPage();

    expect(screen.getByRole('tab', { name: 'Media wanted' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Subtitles wanted' })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Dune: Part Two')).toBeInTheDocument();
      expect(screen.getByText('Poor Things')).toBeInTheDocument();
      expect(screen.getByText('S2E1 · Hello, Ms. Cobel')).toBeInTheDocument();
    });
    expect(manage.listMediaWanted).toHaveBeenCalledWith();
  });

  it('switches to the subtitles tab and loads coverage, wanted lists and providers', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Dune: Part Two');

    await openSubtitles(user);

    expect(manage.getPriorityCoverage).toHaveBeenCalledWith(14);
    expect(manage.getSubtitleCoverage).toHaveBeenCalled();
    expect(manage.listSubtitleWantedMovies).toHaveBeenCalledWith({ page: 1, pageSize: 10_000 });
    expect(manage.listSubtitleWantedSeries).toHaveBeenCalledWith({ page: 1, pageSize: 10_000 });
    expect(clients.subtitleProvidersApi.listProviders).toHaveBeenCalled();

    // Coverage rows and wanted-subtitle rows both render.
    expect(screen.getByText('The Beating')).toBeInTheDocument();
    expect(screen.getByText('The Avengers (2012)')).toBeInTheDocument();
    expect(screen.getByText('X-Men: Apocalypse (2016)')).toBeInTheDocument();
  });

  it('filters wanted media by type', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Dune: Part Two');

    await user.selectOptions(screen.getByLabelText('Media type'), 'movie');
    expect(screen.getByText('Dune: Part Two')).toBeInTheDocument();
    expect(screen.queryByText('S2E1 · Hello, Ms. Cobel')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Media type'), 'episode');
    expect(screen.queryByText('Dune: Part Two')).not.toBeInTheDocument();
    expect(screen.getByText('S2E1 · Hello, Ms. Cobel')).toBeInTheDocument();
  });

  it('filters wanted media by release status', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Dune: Part Two');

    await user.selectOptions(screen.getByLabelText('Media status'), 'announced');

    expect(screen.getByText('Poor Things')).toBeInTheDocument();
    expect(screen.queryByText('Dune: Part Two')).not.toBeInTheDocument();
    expect(screen.queryByText('S2E1 · Hello, Ms. Cobel')).not.toBeInTheDocument();
  });

  it('sorts wanted media by recently added instead of priority', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Dune: Part Two');

    // Server priority order puts Dune first.
    const before = screen.getAllByRole('row');
    expect(within(before[1]).getByText('Dune: Part Two')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Media sort'), 'added');

    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      expect(within(rows[1]).getByText('S2E1 · Hello, Ms. Cobel')).toBeInTheDocument();
    });
  });

  it('re-searches one media item and reports the grabbed release', async () => {
    const user = userEvent.setup();
    renderPage();
    const title = await screen.findByText('Dune: Part Two');

    await user.click(
      within(title.closest('tr') as HTMLElement).getByRole('button', {
        name: 'Search Dune: Part Two (2024)',
      }),
    );

    expect(manage.searchMediaItem).toHaveBeenCalledWith(101, 'movie');
    expect(await screen.findByText(/Grabbed “Dune.2024.1080p”/)).toBeInTheDocument();
  });

  it('shows the server error text verbatim when a single media search fails', async () => {
    const user = userEvent.setup();
    manage.searchMediaItem.mockRejectedValueOnce(new Error('No releases found'));
    renderPage();
    const title = await screen.findByText('Dune: Part Two');

    await user.click(
      within(title.closest('tr') as HTMLElement).getByRole('button', {
        name: 'Search Dune: Part Two (2024)',
      }),
    );

    expect(await screen.findByText('No releases found')).toBeInTheDocument();
  });

  it('runs the bulk media search through the real route', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Dune: Part Two');

    await user.click(screen.getByRole('button', { name: 'Search all' }));

    expect(manage.searchAllMedia).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByText('Background search triggered for all wanted media'),
    ).toBeInTheDocument();
  });

  it('shows the disabled-provider notice instead of pretending re-search works', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Dune: Part Two');

    await openSubtitles(user);

    expect(screen.getByText('No subtitle provider is enabled')).toBeInTheDocument();
    expect(
      screen.getByText(/nothing is queued while every subtitle provider is disabled/),
    ).toBeInTheDocument();
  });

  it('hides the disabled-provider notice when a provider is active', async () => {
    clients.subtitleProvidersApi.listProviders.mockResolvedValue([
      { id: 'opensubtitles', name: 'OpenSubtitles', enabled: true, type: 'api', settings: {}, status: 'active' },
    ]);
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Dune: Part Two');

    await openSubtitles(user);

    expect(screen.queryByText('No subtitle provider is enabled')).not.toBeInTheDocument();
  });

  it('re-searches one wanted subtitle and explains the disabled provider', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Dune: Part Two');
    await openSubtitles(user);

    const row = screen.getByText('The Avengers (2012)').closest('tr') as HTMLElement;
    await user.click(
      within(row).getByRole('button', { name: 'Re-search The Avengers (2012)' }),
    );

    expect(manage.searchSubtitleMovieItem).toHaveBeenCalledWith(382, 'en');
    expect(await screen.findByText(/0 subtitles will be queued/)).toBeInTheDocument();
  });

  it('runs the bulk movie subtitle re-search through the real route', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Dune: Part Two');
    await openSubtitles(user);

    await user.click(screen.getByRole('button', { name: 'Re-search movies' }));

    expect(manage.searchAllSubtitleMovies).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/0 were queued/)).toBeInTheDocument();
  });

  it('filters wanted subtitles by priority bucket', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Dune: Part Two');
    await openSubtitles(user);

    await user.selectOptions(screen.getByLabelText('Subtitle priority bucket'), 'backfill');

    expect(screen.getByText('X-Men: Apocalypse (2016)')).toBeInTheDocument();
    expect(screen.queryByText('The Avengers (2012)')).not.toBeInTheDocument();
  });

  it('displays the server error verbatim when the subtitle wanted list fails', async () => {
    manage.listSubtitleWantedMovies.mockRejectedValueOnce(
      new Error('Subtitle wanted store unavailable'),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Dune: Part Two');

    await user.click(screen.getByRole('tab', { name: 'Subtitles wanted' }));

    expect(await screen.findByText('Subtitle wanted store unavailable')).toBeInTheDocument();
  });

  it('warns that automatic media searching is idle when no indexer exists', async () => {
    clients.indexerApi.list.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText('Automatic searching is idle')).toBeInTheDocument();
    expect(screen.getByText(/Settings .* Indexers/)).toBeInTheDocument();
  });
});
