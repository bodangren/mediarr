import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ActiveDownloadsWidget } from './ActiveDownloadsWidget';
import type { TorrentItem } from '@/lib/api/torrentApi';

describe('ActiveDownloadsWidget', () => {
  it('renders loading state', () => {
    render(
      <MemoryRouter>
        <ActiveDownloadsWidget torrents={[]} isLoading={true} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders empty state with queue link', () => {
    render(
      <MemoryRouter>
        <ActiveDownloadsWidget torrents={[]} isLoading={false} />
      </MemoryRouter>,
    );

    expect(screen.getByText('No active downloads.')).toBeInTheDocument();
    expect(screen.getByText('Queue')).toBeInTheDocument();
  });

  it('filters to show only downloading and seeding torrents', () => {
    const torrents: TorrentItem[] = [
      {
        infoHash: 'hash1',
        name: 'Downloading Torrent',
        status: 'downloading',
        progress: 0.5,
        downloadSpeed: 1000000,
        size: '1 GB',
        downloaded: '500 MB',
        uploaded: '0 MB',
      },
      {
        infoHash: 'hash2',
        name: 'Seeding Torrent',
        status: 'seeding',
        progress: 1,
        uploadSpeed: 500000,
        size: '2 GB',
        downloaded: '2 GB',
        uploaded: '4 GB',
      },
      {
        infoHash: 'hash3',
        name: 'Paused Torrent',
        status: 'paused',
        progress: 0.3,
        size: '500 MB',
        downloaded: '150 MB',
        uploaded: '0 MB',
      },
    ];

    render(
      <MemoryRouter>
        <ActiveDownloadsWidget torrents={torrents} isLoading={false} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Downloading Torrent')).toBeInTheDocument();
    expect(screen.getByText('Seeding Torrent')).toBeInTheDocument();
    expect(screen.queryByText('Paused Torrent')).not.toBeInTheDocument();
  });

  it('limits display to 4 active torrents', () => {
    const torrents: TorrentItem[] = Array.from({ length: 6 }, (_, i) => ({
      infoHash: `hash${i}`,
      name: `Active Torrent ${i + 1}`,
      status: 'downloading',
      progress: 0.5,
      downloadSpeed: 1000000,
      size: '1 GB',
      downloaded: '500 MB',
      uploaded: '0 MB',
    }));

    render(
      <MemoryRouter>
        <ActiveDownloadsWidget torrents={torrents} isLoading={false} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Active Torrent 1')).toBeInTheDocument();
    expect(screen.getByText('Active Torrent 4')).toBeInTheDocument();
    expect(screen.queryByText('Active Torrent 5')).not.toBeInTheDocument();
  });

  it('displays progress percentage', () => {
    const torrents: TorrentItem[] = [
      {
        infoHash: 'hash1',
        name: 'Test Torrent',
        status: 'downloading',
        progress: 0.75,
        downloadSpeed: 1000000,
        size: '1 GB',
        downloaded: '750 MB',
        uploaded: '0 MB',
      },
    ];

    render(
      <MemoryRouter>
        <ActiveDownloadsWidget torrents={torrents} isLoading={false} />
      </MemoryRouter>,
    );

    expect(screen.getByText('75%')).toBeInTheDocument();
  });
});
