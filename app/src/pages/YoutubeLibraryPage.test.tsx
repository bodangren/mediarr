/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { YoutubeLibraryPage } from './YoutubeLibraryPage';
import { getApiClients } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({ getApiClients: vi.fn() }));

const videos = [
  {
    id: 1, videoId: 'abc', title: 'React tutorial', channel: 'CodeStoic',
    durationSeconds: 600, publishedAt: null, isWatched: false, position: 0,
    streamUrl: '/api/youtube/videos/1/stream', thumbUrl: '/api/youtube/videos/1/thumbnail',
  },
];

describe('YoutubeLibraryPage', () => {
  it('shows the download queue health above the channel list', async () => {
    (getApiClients as any).mockReturnValue({
      youtubeApi: {
        listVideos: vi.fn().mockResolvedValue({ items: videos, count: 1 }),
        getQueue: vi.fn().mockResolvedValue({ available: 299, pending: 316, downloading: 0, failed: 40, retrying: 40, exhausted: 0, quarantined: 1, total: 656 }),
      },
    });

    render(<BrowserRouter><YoutubeLibraryPage /></BrowserRouter>);

    await waitFor(() => expect(screen.getByText('299 available')).toBeInTheDocument());
    expect(screen.getByText('316 pending')).toBeInTheDocument();
    expect(screen.getByText('40 retrying')).toBeInTheDocument();
    expect(screen.getByText('1 quarantined')).toBeInTheDocument();
    expect(screen.getByText('CodeStoic (1)')).toBeInTheDocument();
  });
});
