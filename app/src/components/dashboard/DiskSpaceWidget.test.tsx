import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DiskSpaceWidget } from './DiskSpaceWidget';
import type { DiskSpaceInfo } from '@/lib/api/dashboardApi';

describe('DiskSpaceWidget', () => {
  it('renders loading state', () => {
    render(<DiskSpaceWidget data={[]} isLoading={true} />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders empty state', () => {
    render(<DiskSpaceWidget data={[]} isLoading={false} />);

    expect(screen.getByText('No root folders configured.')).toBeInTheDocument();
  });

  it('renders disk space info with correct labels', () => {
    const data: DiskSpaceInfo[] = [
      {
        path: '/data/media',
        label: 'Media',
        free: 500000000000,
        total: 1000000000000,
        usedPercent: 50,
      },
      {
        path: '/data/downloads',
        label: 'Downloads',
        free: 200000000000,
        total: 500000000000,
        usedPercent: 60,
      },
    ];

    render(<DiskSpaceWidget data={data} isLoading={false} />);

    expect(screen.getByText('Media')).toBeInTheDocument();
    expect(screen.getByText('Downloads')).toBeInTheDocument();
    expect(screen.getByText('/data/media')).toBeInTheDocument();
    expect(screen.getByText('/data/downloads')).toBeInTheDocument();
  });

  it('calculates total used percentage correctly', () => {
    const data: DiskSpaceInfo[] = [
      {
        path: '/data/media',
        label: 'Media',
        free: 500,
        total: 1000,
        usedPercent: 50,
      },
      {
        path: '/data/downloads',
        label: 'Downloads',
        free: 200,
        total: 1000,
        usedPercent: 80,
      },
    ];

    render(<DiskSpaceWidget data={data} isLoading={false} />);

    // Total: 2000, Free: 700, Used: 1300, UsedPercent: 65%
    expect(screen.getByText('65%')).toBeInTheDocument();
  });

  it('handles zero total gracefully', () => {
    const data: DiskSpaceInfo[] = [
      {
        path: '/data/media',
        label: 'Media',
        free: 0,
        total: 0,
        usedPercent: 0,
      },
    ];

    render(<DiskSpaceWidget data={data} isLoading={false} />);

    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});
