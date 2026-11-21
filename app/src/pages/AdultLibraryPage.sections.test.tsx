/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdultLibraryPage } from './AdultLibraryPage';
import { getApiClients } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({ getApiClients: vi.fn() }));

const base = {
  id: 1,
  title: 'Scene One',
  fileName: 'scene-one.mp4',
  studio: 'BFFs',
  quality: '1080p',
  releaseDate: null,
  needsReview: false,
  path: '/data/Porn/BFFs/scene-one.mp4',
  sizeBytes: 1_000,
  isWatched: false,
  keep: false,
  decidedAt: null,
  thumbUrl: null,
  seriesKey: 'BFFs',
  tags: ['studio:bffs', 'quality:1080p'],
};

function setupApi() {
  const listItems = vi.fn().mockResolvedValue({
    items: [base, { ...base, id: 2, title: 'Scene Two', path: '/data/Porn/BFFs/scene-two.mp4' }],
    page: 1,
    pageSize: 24,
    totalCount: 2,
    needsReview: 0,
  });
  const listTags = vi.fn().mockResolvedValue([
    { tag: 'studio:bffs', count: 16 },
    { tag: 'quality:1080p', count: 93 },
  ]);
  const listSeries = vi.fn().mockResolvedValue({ series: [{ seriesKey: 'BFFs', count: 16 }], unshelved: 2 });
  (getApiClients as any).mockReturnValue({
    adultLibraryApi: {
      listItems,
      listTags,
      listSeries,
      listDecisions: vi.fn().mockResolvedValue({ items: [], total: 0 }),
      decide: vi.fn(),
      streamUrl: (id: number) => `/api/adult/items/${id}/stream`,
      reportProgress: vi.fn().mockResolvedValue({}),
    },
  });
  return { listItems, listTags };
}

describe('AdultLibraryPage sections and tags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders tag chips and filters through the API', async () => {
    const { listItems } = setupApi();
    render(<AdultLibraryPage />);

    const chip = await screen.findByRole('button', { name: /bffs \(16\)/i });
    await userEvent.click(chip);

    await waitFor(() => {
      expect(listItems).toHaveBeenCalledWith(expect.objectContaining({ tags: ['studio:bffs'] }));
    });
  });

  it('groups the library into series shelves', async () => {
    setupApi();
    render(<AdultLibraryPage />);

    await userEvent.click(await screen.findByRole('button', { name: /^Series$/ }));

    const shelf = await screen.findByRole('region', { name: 'Series BFFs' });
    expect(shelf).toBeInTheDocument();
    expect(screen.getByText('BFFs')).toBeInTheDocument();
  });
});
