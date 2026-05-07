import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SeriesInteractiveSearchModal } from './SeriesInteractiveSearchModal';
import { ToastProvider } from '@/components/providers/ToastProvider';
import * as clientModule from '@/lib/api/client';

const mockApi = {
  seriesApi: {
    searchReleases: vi.fn(),
  },
  releaseApi: {
    grabCandidate: vi.fn(),
    grabRelease: vi.fn(),
  },
};

function renderWithToast(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe('SeriesInteractiveSearchModal Score Breakdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(clientModule, 'getApiClients').mockReturnValue(mockApi as unknown as ReturnType<typeof clientModule.getApiClients>);
  });

  it('shows score breakdown when score is clicked', async () => {
    mockApi.seriesApi.searchReleases.mockResolvedValue({
      items: [
        {
          id: '1',
          guid: 'guid-1',
          indexer: 'TestIndexer',
          indexerId: 1,
          title: 'Show.S01E01.1080p.BluRay.x264',
          size: 1000000000,
          seeders: 100,
          leechers: 10,
          publishDate: new Date().toISOString(),
          age: 1,
          protocol: 'torrent',
          customFormatScore: 395,
          scoringBreakdown: {
            customFormats: [{ id: 1, name: 'HDR10', score: 50 }],
            customFormatScore: 50,
            confidenceScore: 100,
            indexerPriority: 25,
            indexerScore: 125,
            seeders: 100,
            seedScore: 20,
            totalScore: 395,
          },
        },
      ],
      meta: { page: 1, pageSize: 500, totalCount: 1, totalPages: 1 },
    });

    renderWithToast(
      <SeriesInteractiveSearchModal
        isOpen={true}
        onClose={() => {}}
        seriesId={1}
        seriesTitle="Test Show"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Show.S01E01.1080p.BluRay.x264')).toBeInTheDocument();
    });

    // Click on the score to expand breakdown
    fireEvent.click(screen.getByText('+395'));

    await waitFor(() => {
      expect(screen.getByText('Total Score')).toBeInTheDocument();
      expect(screen.getByText('395')).toBeInTheDocument();
      expect(screen.getByText('HDR10')).toBeInTheDocument();
    });
  });

  it('does not show breakdown toggle when no scoring data', async () => {
    mockApi.seriesApi.searchReleases.mockResolvedValue({
      items: [
        {
          id: '1',
          guid: 'guid-1',
          indexer: 'TestIndexer',
          indexerId: 1,
          title: 'Show.S01E01.1080p.BluRay.x264',
          size: 1000000000,
          seeders: 100,
          publishDate: new Date().toISOString(),
          age: 1,
          protocol: 'torrent',
        },
      ],
      meta: { page: 1, pageSize: 500, totalCount: 1, totalPages: 1 },
    });

    renderWithToast(
      <SeriesInteractiveSearchModal
        isOpen={true}
        onClose={() => {}}
        seriesId={1}
        seriesTitle="Test Show"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Show.S01E01.1080p.BluRay.x264')).toBeInTheDocument();
    });

    // No score shown, so no clickable element
    expect(screen.queryByText('+395')).not.toBeInTheDocument();
  });
});
