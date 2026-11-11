/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { YoutubeLibraryPage } from './YoutubeLibraryPage';
import { getApiClients } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({ getApiClients: vi.fn() }));

const videos = [
  {
    id: 1, videoId: 'abc', title: 'React tutorial', channel: 'CodeStoic',
    durationSeconds: 600, publishedAt: null, isWatched: false, position: 0,
    path: '/data/Youtube/react.mp4',
    streamUrl: '/api/youtube/videos/1/stream', thumbUrl: '/api/youtube/videos/1/thumbnail',
  },
];

const queue = {
  available: 299, pending: 316, downloading: 0, failed: 40,
  retrying: 40, exhausted: 0, quarantined: 1, total: 656,
  throughput: { windowHours: 24, downloaded: 77, runs: 51, perHour: 3.2, etaHours: 99 },
};

const subscription = {
  id: 1,
  kind: 'CHANNEL',
  url: 'https://www.youtube.com/@DaveGrayTeachesCode',
  externalId: '@DaveGrayTeachesCode',
  title: 'Dave Gray',
  enabled: true,
  lastPolledAt: '2026-11-11T11:21:04.000Z',
  lastError: null,
  added: '2026-11-08T03:47:34.000Z',
};

const candidate = {
  id: 50,
  videoId: 'old-1',
  title: 'Old watched',
  channel: 'Chan',
  source: 'SUBSCRIPTION',
  isWatched: true,
  watchedAt: '2026-10-01T10:00:00.000Z',
  path: '/data/Youtube/old.mp4',
  sizeBytes: 1_234_567,
};

const quarantined = {
  ...candidate,
  id: 51,
  videoId: 'old-2',
  title: 'Quarantined old',
  path: '/data/Youtube/_quarantine/old.mp4',
  sizeBytes: 2_000,
};

function makeApi() {
  return {
    listVideos: vi.fn().mockResolvedValue({ items: videos, count: 1 }),
    getQueue: vi.fn().mockResolvedValue(queue),
    listSubscriptions: vi.fn().mockResolvedValue([subscription]),
    addSubscription: vi.fn(),
    updateSubscription: vi.fn(),
    deleteSubscription: vi.fn().mockResolvedValue({ id: 1, deleted: true }),
    pollSubscription: vi.fn().mockResolvedValue({
      subscriptionId: 1, seen: 3, queued: 2, duplicates: 1, skipped: 0, failures: [], error: null,
    }),
    pollAllSubscriptions: vi.fn().mockResolvedValue({
      at: '2026-11-11T12:00:00.000Z',
      subscriptions: 1,
      results: [{
        subscriptionId: 1, seen: 3, queued: 2, duplicates: 1, skipped: 0, failures: [], error: null,
      }],
      queued: 2,
      failures: 0,
    }),
    listQueueItems: vi.fn().mockResolvedValue({ items: [], count: 0, status: 'PENDING', limit: 50 }),
    downloadBatch: vi.fn(),
    retryVideo: vi.fn(),
    downloadVideo: vi.fn(),
    removeVideo: vi.fn(),
    deleteVideoFile: vi.fn(),
    listRetentionCandidates: vi.fn().mockResolvedValue({ retentionDays: 7, candidates: [candidate], count: 1 }),
    listQuarantined: vi.fn().mockResolvedValue({ items: [quarantined], count: 1 }),
    runRetention: vi.fn(),
    restoreRetention: vi.fn(),
    purgeRetention: vi.fn(),
  };
}

let api: ReturnType<typeof makeApi>;

function renderPage() {
  return render(<BrowserRouter><YoutubeLibraryPage /></BrowserRouter>);
}

async function openTab(name: RegExp) {
  fireEvent.click(await screen.findByRole('tab', { name }));
}

async function confirmDialog() {
  const dialog = await screen.findByRole('dialog');
  return within(dialog);
}

describe('YoutubeLibraryPage', () => {
  beforeEach(() => {
    api = makeApi();
    (getApiClients as any).mockReturnValue({ youtubeApi: api });
  });

  it('shows the download queue health above the channel list', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText('299 available')).toBeInTheDocument());
    expect(screen.getByText('316 pending')).toBeInTheDocument();
    expect(screen.getByText('40 retrying')).toBeInTheDocument();
    expect(screen.getByText('1 quarantined')).toBeInTheDocument();
    expect(screen.getByText('CodeStoic (1)')).toBeInTheDocument();
  });

  it('adds, renames, toggles, polls and removes a subscription', async () => {
    api.addSubscription.mockResolvedValue({
      ...subscription,
      id: 2,
      title: 'New Channel',
      url: 'https://www.youtube.com/@newchannel',
    });
    api.updateSubscription
      .mockResolvedValueOnce({ ...subscription, enabled: false })
      .mockResolvedValueOnce({ ...subscription, title: 'Dave Codes' });
    renderPage();

    await openTab(/Subscriptions/);
    await screen.findByText('Dave Gray');

    fireEvent.change(screen.getByLabelText('Channel or playlist URL'), {
      target: { value: 'https://www.youtube.com/@newchannel' },
    });
    fireEvent.change(screen.getByLabelText('Subscription label'), { target: { value: 'New Channel' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add subscription' }));
    await waitFor(() => expect(api.addSubscription).toHaveBeenCalledWith({
      url: 'https://www.youtube.com/@newchannel',
      title: 'New Channel',
    }));
    await screen.findByText(/Added New Channel \(CHANNEL\)\./);

    fireEvent.click(screen.getByRole('switch', { name: 'Enable Dave Gray' }));
    await waitFor(() => expect(api.updateSubscription).toHaveBeenCalledWith(1, { enabled: false }));
    await screen.findByText('Dave Gray is now disabled.');

    fireEvent.click(screen.getAllByRole('button', { name: 'Rename' })[0]!);
    fireEvent.change(screen.getByLabelText('Label for Dave Gray'), { target: { value: 'Dave Codes' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save label' }));
    await waitFor(() => expect(api.updateSubscription).toHaveBeenCalledWith(1, { title: 'Dave Codes' }));

    fireEvent.click(screen.getAllByRole('button', { name: 'Poll now' })[0]!);
    await screen.findByText('Polled Dave Codes: 3 seen, 2 queued, 1 duplicates, 0 skipped.');
    expect(api.pollSubscription).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]!);
    const dialog = await confirmDialog();
    expect(dialog.getByText('https://www.youtube.com/@DaveGrayTeachesCode')).toBeInTheDocument();
    fireEvent.click(dialog.getByRole('button', { name: 'Remove subscription' }));
    await waitFor(() => expect(api.deleteSubscription).toHaveBeenCalledWith(1));
    await screen.findByText('Removed Dave Gray.');
  }, 15000);

  it('shows the server error verbatim when adding a subscription fails', async () => {
    api.addSubscription.mockRejectedValue(
      new Error('url must be a YouTube channel (UC… or @handle) or playlist URL, not a video'),
    );
    renderPage();

    await openTab(/Subscriptions/);
    await screen.findByText('Dave Gray');
    fireEvent.change(screen.getByLabelText('Channel or playlist URL'), {
      target: { value: 'https://www.youtube.com/watch?v=abc' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add subscription' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'url must be a YouTube channel (UC… or @handle) or playlist URL, not a video',
    );
  });

  it('retries, downloads and removes a queue row', async () => {
    const pendingItem = {
      id: 10, videoId: 'pending-1', title: 'Queued video', channel: 'Chan', status: 'PENDING',
      attempts: 0, retryAt: null, error: null, path: null, isWatched: false, added: '2026-11-11T10:00:00.000Z',
    };
    const failedItem = {
      ...pendingItem, id: 11, videoId: 'failed-1', title: 'Failed video', status: 'FAILED',
      attempts: 4, error: 'Sign in to confirm you are not a bot',
    };
    api.listQueueItems.mockImplementation(async (status: string) => ({
      items: status === 'FAILED' ? [failedItem] : [pendingItem],
      count: 1,
      status,
      limit: 50,
    }));
    api.downloadVideo.mockResolvedValue({
      id: 10, videoId: 'pending-1', attempted: 1, downloaded: 1, failed: [],
    });
    api.retryVideo.mockResolvedValue({ id: 11, status: 'PENDING' });
    api.removeVideo.mockResolvedValue({ id: 11, deleted: true });

    renderPage();
    await openTab(/Queue/);
    await screen.findByText('Queued video');
    expect(api.listQueueItems).toHaveBeenCalledWith('PENDING');

    fireEvent.click(screen.getByRole('button', { name: 'Download now' }));
    await waitFor(() => expect(api.downloadVideo).toHaveBeenCalledWith(10));
    await screen.findByText('Downloaded “Queued video”.');

    fireEvent.click(screen.getByRole('button', { name: /^Failed \(/ }));
    await screen.findByText('Failed video');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Sign in to confirm you are not a bot');

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(api.retryVideo).toHaveBeenCalledWith(11));
    await screen.findByText('Retry queued for “Failed video”.');

    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]!);
    const dialog = await confirmDialog();
    expect(dialog.getByText('failed-1')).toBeInTheDocument();
    fireEvent.click(dialog.getByRole('button', { name: 'Remove from queue' }));
    await waitFor(() => expect(api.removeVideo).toHaveBeenCalledWith(11));
  });

  it('shows failed queue download errors verbatim', async () => {
    const failedItem = {
      id: 12, videoId: 'failed-2', title: 'Broken download', channel: 'Chan', status: 'FAILED',
      attempts: 1, retryAt: null, error: 'HTTP Error 403: Forbidden', path: null,
      isWatched: false, added: '2026-11-11T10:00:00.000Z',
    };
    api.listQueueItems.mockResolvedValue({ items: [failedItem], count: 1, status: 'PENDING', limit: 50 });
    api.downloadVideo.mockResolvedValue({
      id: 12,
      videoId: 'failed-2',
      attempted: 1,
      downloaded: 0,
      failed: [{ id: 12, videoId: 'failed-2', error: 'HTTP Error 403: Forbidden' }],
    });

    renderPage();
    await openTab(/Queue/);
    await screen.findByText('Broken download');
    fireEvent.click(screen.getByRole('button', { name: 'Download now' }));

    await waitFor(() => expect(api.downloadVideo).toHaveBeenCalledWith(12));
    const alerts = await screen.findAllByRole('alert');
    expect(alerts.some((node) => node.textContent === 'HTTP Error 403: Forbidden')).toBe(true);
  });

  it('lists retention candidates with size and age and restores a quarantined file', async () => {
    api.restoreRetention.mockResolvedValue({
      id: 51,
      originalPath: '/data/Youtube/old.mp4',
      dryRun: false,
      restored: true,
    });

    renderPage();
    await openTab(/Retention/);
    await screen.findByText('Old watched');
    expect(screen.getByText(/watched .* \(\d+d ago\) · 1\.2 MB/)).toBeInTheDocument();
    await screen.findByText('Quarantined old');
    expect(screen.getByText('/data/Youtube/_quarantine/old.mp4')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Restore' }));
    await waitFor(() => expect(api.restoreRetention).toHaveBeenCalledWith(51));
    await screen.findByText('Restored to /data/Youtube/old.mp4.');
  });

  it('confirms purging a quarantined file with its exact path', async () => {
    api.purgeRetention.mockResolvedValue({ id: 51, dryRun: false, deleted: true });

    renderPage();
    await openTab(/Retention/);
    await screen.findByText('Quarantined old');
    fireEvent.click(screen.getByRole('button', { name: 'Purge permanently' }));

    const dialog = await confirmDialog();
    expect(dialog.getByText('Permanently delete “Quarantined old”?')).toBeInTheDocument();
    expect(dialog.getByText('/data/Youtube/_quarantine/old.mp4')).toBeInTheDocument();
    fireEvent.click(dialog.getByRole('button', { name: 'Delete permanently' }));

    await waitFor(() => expect(api.purgeRetention).toHaveBeenCalledWith(51));
    await screen.findByText('Permanently deleted /data/Youtube/_quarantine/old.mp4.');
  });

  it('runs retention after a confirmation that names the eligible videos', async () => {
    api.runRetention.mockResolvedValue({
      at: '2026-11-11T12:00:00.000Z',
      dryRun: false,
      retentionDays: 7,
      candidates: 1,
      moved: [{
        id: 50,
        originalPath: '/data/Youtube/old.mp4',
        quarantinePath: '/data/Youtube/_quarantine/old.mp4',
      }],
      failed: [],
      skipped: 0,
    });

    renderPage();
    await openTab(/Retention/);
    await screen.findByText('Old watched');
    fireEvent.click(screen.getByRole('button', { name: 'Quarantine eligible videos' }));

    const dialog = await confirmDialog();
    expect(dialog.getByText('Quarantine 1 watched video?')).toBeInTheDocument();
    expect(dialog.getByText('Old watched')).toBeInTheDocument();
    fireEvent.click(dialog.getByRole('button', { name: 'Quarantine now' }));

    await waitFor(() => expect(api.runRetention).toHaveBeenCalledWith(7, false));
    await screen.findByText(/Moved 1 file to quarantine, skipped 0\./);
  });

  it('deletes a downloaded file after naming its path', async () => {
    api.deleteVideoFile.mockResolvedValue({ id: 1, deleted: true, path: '/data/Youtube/react.mp4' });

    renderPage();
    await screen.findByText('React tutorial');
    fireEvent.click(screen.getByRole('button', { name: 'Delete file for React tutorial' }));

    const dialog = await confirmDialog();
    expect(dialog.getByText('Delete the downloaded file for “React tutorial”?')).toBeInTheDocument();
    expect(dialog.getByText('/data/Youtube/react.mp4')).toBeInTheDocument();
    fireEvent.click(dialog.getByRole('button', { name: 'Delete file' }));

    await waitFor(() => expect(api.deleteVideoFile).toHaveBeenCalledWith(1));
    await screen.findByText('Deleted /data/Youtube/react.mp4 for “React tutorial”.');
    expect(screen.queryByText('React tutorial')).not.toBeInTheDocument();
  });
});
