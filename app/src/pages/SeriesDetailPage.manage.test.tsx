/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SeriesDetailPage } from './SeriesDetailPage';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { createMediaManageApi } from '@/lib/api/mediaManageApi';

vi.mock('@/lib/api/client', () => ({ getApiClients: vi.fn() }));
vi.mock('@/lib/api/mediaManageApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/mediaManageApi')>();
  return { ...actual, createMediaManageApi: vi.fn() };
});

const series = {
  id: 55,
  title: 'Special Ops: Lioness',
  year: 2023,
  monitored: true,
  tvdbId: 4242,
  path: '/data/TV/Special Ops Lioness',
  qualityProfileId: 1,
  seasons: [
    {
      id: 5,
      seasonNumber: 1,
      monitored: true,
      episodes: [
        { id: 101, seasonNumber: 1, episodeNumber: 1, title: 'Sacrificial Soldiers', monitored: true, hasFile: true },
        { id: 102, seasonNumber: 1, episodeNumber: 2, title: 'The Breaking Point', monitored: true, hasFile: true },
      ],
    },
  ],
};

function setupApi() {
  const manage = {
    rescanSeries: vi.fn().mockResolvedValue({
      rescanned: true,
      id: 55,
      episodeCount: 2,
      filesLinked: 2,
    }),
    scanSeriesSubtitles: vi.fn().mockResolvedValue({
      success: true,
      subtitlesFound: 8,
      newSubtitles: 8,
    }),
    matchSeriesSidecars: vi.fn().mockResolvedValue({
      success: true,
      dryRun: true,
      matched: [
        { from: '/data/TV/Special Ops Lioness/Special.Ops.Lioness - S01E01.zho.srt', to: '/data/TV/Special Ops Lioness/Special Ops Lioness - S01E01.zho.srt' },
      ],
      unmatched: [],
    }),
    triggerAutoSearch: vi.fn().mockResolvedValue({ success: true }),
    addToWanted: vi.fn().mockResolvedValue({ id: 9 }),
    deleteSeries: vi.fn().mockResolvedValue({ deleted: true, id: 55 }),
    getPriorityCoverage: vi.fn().mockResolvedValue({
      days: 14,
      items: [
        { mediaType: 'EPISODE', mediaId: 101, title: 'Sacrificial Soldiers', status: 'dual', languages: ['en', 'zh'] },
        { mediaType: 'EPISODE', mediaId: 102, title: 'The Breaking Point', status: 'en-only', languages: ['en'] },
        { mediaType: 'EPISODE', mediaId: 999, title: 'Other show', status: 'none', languages: [] },
      ],
      counts: { dual: 1, 'zho-only': 0, 'en-only': 1, none: 1 },
      total: 3,
    }),
  };

  (createMediaManageApi as any).mockReturnValue(manage);
  (getApiClients as any).mockReturnValue({
    httpClient: {},
    seriesApi: { getSeriesWithEpisodes: vi.fn().mockResolvedValue(series) },
    qualityProfileApi: { list: vi.fn().mockResolvedValue([{ id: 1, name: 'HD-1080p' }]) },
    subtitleApi: { listSeriesVariants: vi.fn().mockResolvedValue([]) },
    mediaApi: {},
  });
  return manage;
}

function renderPage() {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/library/tv/55']}>
        <Routes>
          <Route path="/library/tv/:id" element={<SeriesDetailPage />} />
          <Route path="/library/tv" element={<p>TV library</p>} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

async function manageSection() {
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Manage' })).toBeInTheDocument());
  return screen.getByRole('region', { name: 'Manage' });
}

describe('SeriesDetailPage manage panel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders manage actions and episode-level Chinese subtitle coverage for this series only', async () => {
    setupApi();
    renderPage();
    const section = await manageSection();

    expect(within(section).getByRole('button', { name: 'Rescan series' })).toBeInTheDocument();
    expect(within(section).getByRole('button', { name: 'Search releases / replace file' })).toBeInTheDocument();
    expect(within(section).getByRole('button', { name: 'Rescan subtitles' })).toBeInTheDocument();
    expect(within(section).getByRole('button', { name: 'Match orphaned subtitles' })).toBeInTheDocument();
    expect(within(section).getByRole('button', { name: 'Delete series' })).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByTestId('series-priority-coverage')).toHaveTextContent(
        '1 English + Chinese, 1 English only (Chinese missing)',
      ),
    );
  });

  it('rescans series subtitles and reports found/new counts', async () => {
    const manage = setupApi();
    const user = userEvent.setup();
    renderPage();
    const section = await manageSection();

    await user.click(within(section).getByRole('button', { name: 'Rescan subtitles' }));

    await waitFor(() => expect(manage.scanSeriesSubtitles).toHaveBeenCalledWith(55));
    expect(await within(section).findByText('Subtitle scan complete: 8 found, 8 new')).toBeInTheDocument();
  });

  it('previews orphaned sidecars before applying them', async () => {
    const manage = setupApi();
    const user = userEvent.setup();
    renderPage();
    const section = await manageSection();

    expect(within(section).getByRole('button', { name: 'Apply subtitle copies' })).toBeDisabled();

    await user.click(within(section).getByRole('button', { name: 'Match orphaned subtitles' }));

    await waitFor(() => expect(manage.matchSeriesSidecars).toHaveBeenCalledWith(55));
    expect(await within(section).findByTestId('series-sidecar-preview')).toHaveTextContent(
      '1 sidecar(s) ready to copy',
    );

    await user.click(within(section).getByRole('button', { name: 'Apply 1 subtitle copy' }));
    await waitFor(() => expect(manage.matchSeriesSidecars).toHaveBeenLastCalledWith(55, { apply: true }));
  });

  it('re-searches wanted through the real auto-search route', async () => {
    const manage = setupApi();
    const user = userEvent.setup();
    renderPage();
    const section = await manageSection();

    await user.click(within(section).getByRole('button', { name: 'Re-search wanted' }));

    await waitFor(() => expect(manage.triggerAutoSearch).toHaveBeenCalledWith(55, 'series'));
    expect(
      await within(section).findByText('Series wanted search started in the background'),
    ).toBeInTheDocument();
  });

  it('confirms deletion with the exact series path and honours delete-from-disk', async () => {
    const manage = setupApi();
    const user = userEvent.setup();
    renderPage();
    const section = await manageSection();

    await user.click(within(section).getByRole('button', { name: 'Delete series' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('/data/TV/Special Ops Lioness')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('checkbox', { name: 'Also delete files from disk' }));
    await user.click(within(dialog).getByRole('button', { name: 'Delete series and files' }));

    await waitFor(() => expect(manage.deleteSeries).toHaveBeenCalledWith(55, true));
    expect(await screen.findByText('TV library')).toBeInTheDocument();
  });

  it('shows the server error verbatim when rescan fails', async () => {
    const manage = setupApi();
    manage.rescanSeries.mockRejectedValueOnce(new Error('folderPath must be inside a configured root folder'));
    const user = userEvent.setup();
    renderPage();
    const section = await manageSection();

    await user.click(within(section).getByRole('button', { name: 'Rescan series' }));

    expect(
      await within(section).findByText(/folderPath must be inside a configured root folder/),
    ).toBeInTheDocument();
  });
});
