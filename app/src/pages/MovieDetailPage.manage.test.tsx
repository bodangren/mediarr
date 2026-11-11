/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MovieDetailPage } from './MovieDetailPage';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { createMediaManageApi } from '@/lib/api/mediaManageApi';

vi.mock('@/lib/api/client', () => ({ getApiClients: vi.fn() }));
vi.mock('@/lib/api/mediaManageApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/mediaManageApi')>();
  return { ...actual, createMediaManageApi: vi.fn() };
});

const movie = {
  id: 1,
  title: 'Heat',
  year: 1995,
  monitored: true,
  tmdbId: 949,
  imdbId: 'tt0113277',
  path: '/data/Movies/Heat (1995)',
  sizeOnDisk: 8_000_000_000,
  qualityProfileId: 1,
  collection: null,
};

function setupApi() {
  const manage = {
    rescanMovie: vi.fn().mockResolvedValue({ rescanned: true, id: 1, filesLinked: 2 }),
    scanMovieSubtitles: vi.fn().mockResolvedValue({
      success: true,
      subtitlesFound: 3,
      newSubtitles: 1,
    }),
    matchMovieSidecars: vi.fn().mockResolvedValue({
      success: true,
      dryRun: true,
      matched: [{ from: '/data/Movies/Heat (1995)/Heat.1995.zho.srt', to: '/data/Movies/Heat (1995)/Heat.1995.1080p.zho.srt' }],
      unmatched: [],
    }),
    triggerAutoSearch: vi.fn().mockResolvedValue({
      success: true,
      data: { release: { title: 'Heat.1995.1080p.BluRay' } },
    }),
    addToWanted: vi.fn().mockResolvedValue({ id: 9 }),
    deleteMovie: vi.fn().mockResolvedValue({ deleted: true, id: 1 }),
    getPriorityCoverage: vi.fn().mockResolvedValue({
      days: 14,
      items: [
        { mediaType: 'MOVIE', mediaId: 1, title: 'Heat', status: 'en-only', languages: ['en'] },
      ],
      counts: { dual: 0, 'zho-only': 0, 'en-only': 1, none: 0 },
      total: 1,
    }),
  };

  (createMediaManageApi as any).mockReturnValue(manage);
  (getApiClients as any).mockReturnValue({
    httpClient: {},
    movieApi: {
      getById: vi.fn().mockResolvedValue(movie),
      getTmdbCollection: vi.fn().mockResolvedValue({ collection: null }),
    },
    qualityProfileApi: { list: vi.fn().mockResolvedValue([{ id: 1, name: 'HD-1080p' }]) },
    subtitleApi: { listMovieVariants: vi.fn().mockResolvedValue([]) },
    mediaApi: {},
  });
  return manage;
}

function renderPage() {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/library/movies/1']}>
        <Routes>
          <Route path="/library/movies/:id" element={<MovieDetailPage />} />
          <Route path="/library/movies" element={<p>Movies library</p>} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

async function manageSection() {
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Manage' })).toBeInTheDocument());
  return screen.getByRole('region', { name: 'Manage' });
}

describe('MovieDetailPage manage panel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders manage actions and the recent-playback Chinese subtitle coverage', async () => {
    setupApi();
    renderPage();
    const manage = await manageSection();

    expect(within(manage).getByRole('button', { name: 'Rescan movie' })).toBeInTheDocument();
    expect(within(manage).getByRole('button', { name: 'Search releases / replace file' })).toBeInTheDocument();
    expect(within(manage).getByRole('button', { name: 'Rescan subtitles' })).toBeInTheDocument();
    expect(within(manage).getByRole('button', { name: 'Match orphaned subtitles' })).toBeInTheDocument();
    expect(within(manage).getByRole('button', { name: 'Delete movie' })).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByTestId('movie-priority-coverage')).toHaveTextContent(
        'English only (Chinese missing)',
      ),
    );
  });

  it('rescans the movie folder and reports linked files', async () => {
    const manage = setupApi();
    const user = userEvent.setup();
    renderPage();
    const section = await manageSection();

    await user.click(within(section).getByRole('button', { name: 'Rescan movie' }));

    await waitFor(() => expect(manage.rescanMovie).toHaveBeenCalledWith(1));
    expect(await within(section).findByText('Rescan complete: 2 file(s) linked')).toBeInTheDocument();
  });

  it('rescans subtitles and shows subtitlesFound/newSubtitles', async () => {
    const manage = setupApi();
    const user = userEvent.setup();
    renderPage();
    const section = await manageSection();

    await user.click(within(section).getByRole('button', { name: 'Rescan subtitles' }));

    await waitFor(() => expect(manage.scanMovieSubtitles).toHaveBeenCalledWith(1));
    expect(await within(section).findByText('Subtitle scan complete: 3 found, 1 new')).toBeInTheDocument();
  });

  it('previews orphaned sidecars, then applies the copies explicitly', async () => {
    const manage = setupApi();
    const user = userEvent.setup();
    renderPage();
    const section = await manageSection();

    const applyButton = within(section).getByRole('button', { name: 'Apply subtitle copies' });
    expect(applyButton).toBeDisabled();

    await user.click(within(section).getByRole('button', { name: 'Match orphaned subtitles' }));

    await waitFor(() => expect(manage.matchMovieSidecars).toHaveBeenCalledWith(1));
    expect(await screen.findByTestId('movie-sidecar-preview')).toHaveTextContent(
      '1 sidecar(s) ready to copy',
    );

    const enabledApply = within(section).getByRole('button', { name: 'Apply 1 subtitle copy' });
    expect(enabledApply).toBeEnabled();
    await user.click(enabledApply);
    await waitFor(() => expect(manage.matchMovieSidecars).toHaveBeenLastCalledWith(1, { apply: true }));
  });

  it('confirms deletion with the exact path and honours delete-from-disk', async () => {
    const manage = setupApi();
    const user = userEvent.setup();
    renderPage();
    const section = await manageSection();

    await user.click(within(section).getByRole('button', { name: 'Delete movie' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('/data/Movies/Heat (1995)')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('checkbox', { name: 'Also delete files from disk' }));
    await user.click(within(dialog).getByRole('button', { name: 'Delete movie and files' }));

    await waitFor(() => expect(manage.deleteMovie).toHaveBeenCalledWith(1, true));
    expect(await screen.findByText('Movies library')).toBeInTheDocument();
  });

  it('shows the server error verbatim when a manage action fails', async () => {
    const manage = setupApi();
    manage.deleteMovie.mockRejectedValueOnce(new Error('Movie 1 is attached to an active torrent'));
    const user = userEvent.setup();
    renderPage();
    const section = await manageSection();

    await user.click(within(section).getByRole('button', { name: 'Delete movie' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Delete movie' }));

    expect(
      await within(section).findByText(/Movie 1 is attached to an active torrent/),
    ).toBeInTheDocument();
  });
});
