import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MusicLibraryPage } from './MusicLibraryPage';

const mocks = vi.hoisted(() => ({
  api: {
    listArtists: vi.fn(),
    listAlbums: vi.fn(),
    getAlbum: vi.fn(),
    searchTracks: vi.fn(),
    getListeningProfile: vi.fn(),
    scan: vi.fn(),
    ingest: vi.fn(),
    getReceipts: vi.fn(),
    deleteTrack: vi.fn(),
    reportMusicSkip: vi.fn(),
  },
}));

vi.mock('@/lib/api/musicManageApi', () => ({
  musicManageApi: mocks.api,
  albumArtworkUrl: (id: number) => `/api/music/albums/${id}/artwork`,
  trackStreamUrl: (id: number) => `/api/music/tracks/${id}/stream`,
}));

const artists = [
  { id: 87, name: 'AC/DC', albumCount: 2, trackCount: 2 },
  { id: 88, name: 'Various Artists', albumCount: 1, trackCount: 203 },
];

const albums = [
  { id: 92, artistId: 87, title: 'Back in Black', year: null, trackCount: 1, artworkUrl: '/api/music/albums/92/artwork' },
  { id: 93, artistId: 87, title: 'POWER UP', year: 2020, trackCount: 1, artworkUrl: '/api/music/albums/93/artwork' },
];

const albumDetail = {
  id: 92,
  artistId: 87,
  title: 'Back in Black',
  year: null,
  artworkPath: null,
  added: '2026-11-08T12:50:04.000Z',
  trackCount: 1,
  tracks: [
    { id: 218, title: 'Back in Black', trackNumber: 1, discNumber: null, durationSeconds: 254, isPlayed: true, playCount: 1 },
  ],
};

const profile = {
  artists: [
    { name: 'AC/DC', plays: 1, lastPlayedAt: '2026-11-09T13:42:46.000Z', tracks: 2 },
    { name: 'Various Artists', plays: 0, lastPlayedAt: null, tracks: 203 },
  ],
  tracks: [
    { id: 218, title: 'Back in Black', artist: 'AC/DC', playCount: 1, lastPlayedAt: '2026-11-09T13:42:46.000Z' },
  ],
  recentlyPlayed: [
    { id: 218, title: 'Back in Black', artist: 'AC/DC', playCount: 1, lastPlayedAt: '2026-11-09T13:42:46.000Z' },
  ],
  library: { trackCount: 217, artistNames: ['AC/DC', 'Various Artists'], trackKeys: ['AC/DC — Back in Black'] },
  dataQuality: {
    playsObserved: 1,
    tracksPlayed: 1,
    lastPlayedAt: '2026-11-09T13:42:46.000Z',
    insufficientHistory: true,
  },
};

const receipts = {
  receipts: [
    {
      at: '2026-11-11T13:38:39.857Z',
      videoId: 'zsCD5XCu6CM',
      status: 'REVIEW',
      reason: 'untaggable: missing album after beets',
      path: '/data/Music/_review/music-zsCD5XCu6CM.m4a',
    },
    {
      at: '2026-11-09T12:17:43.608Z',
      videoId: 'v2AC41dglnM',
      status: 'FAILED',
      reason: 'Sign in to confirm you’re not a bot.',
      path: null,
    },
  ],
  summary: { attempted: 2, filed: 0, review: 1, failed: 1, skipped: 0 },
  count: 2,
};

function resetApi() {
  mocks.api.listArtists.mockResolvedValue(artists);
  mocks.api.listAlbums.mockResolvedValue(albums);
  mocks.api.getAlbum.mockResolvedValue(albumDetail);
  mocks.api.searchTracks.mockResolvedValue({
    items: [
      {
        id: 218,
        title: 'Back in Black',
        albumId: 92,
        artistId: 87,
        artistName: 'AC/DC',
        albumTitle: 'Back in Black',
        albumArtworkUrl: '/api/music/albums/92/artwork',
        durationSeconds: 254,
        trackNumber: 1,
        discNumber: null,
        isPlayed: true,
        playCount: 1,
        lastPlayedAt: '2026-11-09T13:42:46.000Z',
      },
    ],
    count: 1,
    total: 1,
    offset: 0,
    limit: 50,
    query: 'black',
  });
  mocks.api.getListeningProfile.mockResolvedValue(profile);
  mocks.api.scan.mockResolvedValue({
    scanned: 217,
    artists: 12,
    albums: 11,
    tracks: 217,
    unreadable: [],
  });
  mocks.api.getReceipts.mockResolvedValue(receipts);
}

function renderPage() {
  return render(<BrowserRouter><MusicLibraryPage /></BrowserRouter>);
}

function listeningCard() {
  return within(screen.getByRole('region', { name: 'Listening summary' }));
}

describe('MusicLibraryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetApi();
  });

  it('renders the artist grid with album and track counts', async () => {
    renderPage();

    expect(await screen.findByRole('button', { name: 'Open artist AC/DC' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open artist Various Artists' })).toBeInTheDocument();
    expect(screen.getByText('2 albums · 2 tracks')).toBeInTheDocument();
    expect(screen.getByText('1 album · 203 tracks')).toBeInTheDocument();
  });

  it('deletes a track only after the confirmation and reports the outcome', async () => {
    mocks.api.deleteTrack.mockResolvedValue({
      trackId: 218,
      title: 'Back in Black',
      path: '/data/Music/AC-DC/Back in Black/01.m4a',
      fileDeleted: true,
    });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Open artist AC/DC' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Open album Back in Black' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Back in Black' }));

    expect(mocks.api.deleteTrack).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm delete' }));
    await waitFor(() => expect(mocks.api.deleteTrack).toHaveBeenCalledWith(218));
    expect(await screen.findByText(/Deleted “Back in Black” and its file/)).toBeInTheDocument();
  });

  it('shows a failed delete verbatim and does not claim success', async () => {
    mocks.api.deleteTrack.mockRejectedValue(
      new Error('OUTSIDE_MUSIC_ROOT: refusing to delete a path outside /data/Music'),
    );
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Open artist AC/DC' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Open album Back in Black' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Back in Black' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm delete' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('OUTSIDE_MUSIC_ROOT');
    expect(screen.queryByText(/Deleted/)).not.toBeInTheDocument();
  });

  it('reports a skipped preview, and not a completed one, to the skip signal', async () => {
    // Owner request 2026-11-28: skipping is the anti-indicator of what to propose next.
    mocks.api.reportMusicSkip.mockResolvedValue({});
    const { container } = renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Open artist AC/DC' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Open album Back in Black' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Preview Back in Black' }));

    const audio = container.querySelector('audio')!;
    Object.defineProperty(audio, 'duration', { value: 254, configurable: true });
    Object.defineProperty(audio, 'currentTime', { value: 20, configurable: true });
    fireEvent.timeUpdate(audio);
    fireEvent.click(screen.getByRole('button', { name: 'Preview Back in Black' }));

    await waitFor(() => expect(mocks.api.reportMusicSkip).toHaveBeenCalledWith(218, 20, 254));

    // A listen that reached the server's 90 % completion threshold is a play, not a skip.
    mocks.api.reportMusicSkip.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Preview Back in Black' }));
    const audio2 = container.querySelector('audio')!;
    Object.defineProperty(audio2, 'duration', { value: 254, configurable: true });
    Object.defineProperty(audio2, 'currentTime', { value: 250, configurable: true });
    fireEvent.timeUpdate(audio2);
    fireEvent.click(screen.getByRole('button', { name: 'Preview Back in Black' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Preview Back in Black' })).toHaveAttribute('aria-pressed', 'false'),
    );
    expect(mocks.api.reportMusicSkip).not.toHaveBeenCalled();
  });

  it('browses artist → albums → tracks and streams a track inline', async () => {
    const { container } = renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Open artist AC/DC' }));
    expect(mocks.api.listAlbums).toHaveBeenCalledWith(87);
    fireEvent.click(await screen.findByRole('button', { name: 'Open album Back in Black' }));
    expect(mocks.api.getAlbum).toHaveBeenCalledWith(92);

    const preview = await screen.findByRole('button', { name: 'Preview Back in Black' });
    expect(screen.getByRole('heading', { level: 2, name: 'Back in Black' })).toBeInTheDocument();
    fireEvent.click(preview);

    const audio = container.querySelector('audio');
    expect(audio).not.toBeNull();
    expect(audio?.getAttribute('src')).toBe('/api/music/tracks/218/stream');
  });

  it('searches tracks across the library', async () => {
    renderPage();

    const input = await screen.findByRole('searchbox', { name: 'Search music' });
    fireEvent.change(input, { target: { value: 'black' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => expect(mocks.api.searchTracks).toHaveBeenCalledWith({ q: 'black', limit: 50 }));
    expect(await screen.findByText('Search results for “black”')).toBeInTheDocument();
    expect(screen.getByText(/AC\/DC · Back in Black · 4:14/)).toBeInTheDocument();
  });

  it('previews a scan as a dry run, then applies it', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Scan library' }));
    await waitFor(() => expect(mocks.api.scan).toHaveBeenCalledWith(true));
    expect(await screen.findByText(/Dry run \(nothing written\): 217 files scanned/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Apply scan' }));
    await waitFor(() => expect(mocks.api.scan).toHaveBeenCalledWith(false));
    expect(await screen.findByText(/Scan applied: 217 files scanned/)).toBeInTheDocument();
  });

  it('ingests a URL and reports where the file was filed', async () => {
    mocks.api.ingest.mockResolvedValue({
      videoId: 'zsCD5XCu6CM',
      ok: true,
      audioPath: '/data/Music/_incoming/music-zsCD5XCu6CM.m4a',
      tag: {
        ok: true,
        filed: true,
        finalPath: '/data/Music/ACDC/Back in Black/01 - Back in Black.m4a',
      },
    });
    renderPage();

    const input = await screen.findByLabelText('YouTube URL to ingest');
    fireEvent.change(input, { target: { value: 'https://www.youtube.com/watch?v=zsCD5XCu6CM' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ingest' }));

    await waitFor(() =>
      expect(mocks.api.ingest).toHaveBeenCalledWith('https://www.youtube.com/watch?v=zsCD5XCu6CM'),
    );
    expect(await screen.findByText(/Filed:/)).toBeInTheDocument();
    expect(screen.getByText('/data/Music/ACDC/Back in Black/01 - Back in Black.m4a')).toBeInTheDocument();
  });

  it('shows a REVIEW ingest as review with the beets reason verbatim, not as a failure', async () => {
    mocks.api.ingest.mockResolvedValue({
      videoId: 'zsCD5XCu6CM',
      ok: true,
      audioPath: '/data/Music/_incoming/music-zsCD5XCu6CM.m4a',
      tag: {
        ok: true,
        filed: false,
        reason: 'untaggable: missing album after beets',
        finalPath: '/data/Music/_review/music-zsCD5XCu6CM.m4a',
      },
    });
    renderPage();

    fireEvent.change(await screen.findByLabelText('YouTube URL to ingest'), {
      target: { value: 'https://www.youtube.com/watch?v=zsCD5XCu6CM' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Ingest' }));

    expect(
      await screen.findByText(/Needs review: untaggable: missing album after beets\./),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Ingest failed/)).not.toBeInTheDocument();
  });

  it('reports the server error verbatim when ingest is rejected', async () => {
    mocks.api.ingest.mockRejectedValue(new Error('url/videoId must identify a YouTube video'));
    renderPage();

    fireEvent.change(await screen.findByLabelText('YouTube URL to ingest'), {
      target: { value: 'not-a-youtube-url' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Ingest' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('url/videoId must identify a YouTube video');
  });

  it('renders the receipts table with FAILED and REVIEW reasons verbatim', async () => {
    renderPage();

    const section = await screen.findByRole('region', { name: 'Ingest receipts' });
    const table = within(section);
    expect(await table.findByText('untaggable: missing album after beets')).toBeInTheDocument();
    expect(table.getByText('Sign in to confirm you’re not a bot.')).toBeInTheDocument();
    expect(table.getByText('REVIEW')).toBeInTheDocument();
    expect(table.getByText('FAILED')).toBeInTheDocument();
    expect(table.getByText(/1 review · 1 failed/)).toBeInTheDocument();
  });

  it('shows the listening summary with a thin-history notice', async () => {
    renderPage();

    const card = await waitFor(() => listeningCard());
    expect(card.getByText(/217 tracks · 2 artists · 1 play observed/)).toBeInTheDocument();
    expect(card.getByText(/Thin listening history: only 1 play observed/)).toBeInTheDocument();
    expect(card.getByText('AC/DC')).toBeInTheDocument();
  });

  it('falls back to the library when the listening profile is unavailable', async () => {
    mocks.api.getListeningProfile.mockRejectedValue(new Error('listening profile unavailable'));
    renderPage();

    expect(await screen.findByText(/listening profile unavailable/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open artist AC/DC' })).toBeInTheDocument();
    expect(screen.getByText(/the library is still available below/)).toBeInTheDocument();
  });
});
