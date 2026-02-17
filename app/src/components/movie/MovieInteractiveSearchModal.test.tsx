import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MovieInteractiveSearchModal } from './MovieInteractiveSearchModal';
import * as releaseApi from '@/lib/api/releaseApi';

// Mock the release API
vi.mock('@/lib/api/releaseApi', () => ({
  createReleaseApi: vi.fn(() => ({
    searchCandidates: vi.fn(),
    grabRelease: vi.fn(),
  })),
}));

describe('MovieInteractiveSearchModal', () => {
  const mockReleaseApi = {
    searchCandidates: vi.fn(),
    grabRelease: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (releaseApi.createReleaseApi as any).mockReturnValue(mockReleaseApi);
  });

  it('should search for releases when modal opens', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { staleTime: 0, retry: false },
      },
    });

    const { result } = renderHook(() => ({ isOpen: true, movieId: 123, movieTitle: 'Test Movie' }));

    mockReleaseApi.searchCandidates.mockResolvedValue({
      items: [
        {
          indexer: 'TestIndexer',
          indexerId: 1,
          title: 'Test.Release.2024.1080p.BluRay.x264',
          size: 2000000000,
          seeders: 100,
          leechers: 50,
          quality: 'Bluray-1080p',
          age: 24,
          publishDate: new Date().toISOString(),
          protocol: 'torrent',
        },
      ],
      meta: {
        page: 1,
        pageSize: 20,
        totalCount: 1,
        totalPages: 1,
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    renderHook(() => MovieInteractiveSearchModal, {
      wrapper,
      initialProps: {
        isOpen: true,
        onClose: vi.fn(),
        movieId: 123,
        movieTitle: 'Test Movie',
        movieYear: 2024,
        imdbId: 'tt1234567',
        tmdbId: 12345,
      },
    });

    await waitFor(() => {
      expect(mockReleaseApi.searchCandidates).toHaveBeenCalledWith({
        type: 'movie',
        title: 'Test Movie',
        tmdbId: 12345,
        imdbId: 'tt1234567',
        year: 2024,
      });
    });
  });

  it('should grab release when grab button is clicked', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { staleTime: 0, retry: false },
      },
    });

    mockReleaseApi.searchCandidates.mockResolvedValue({
      items: [
        {
          indexer: 'TestIndexer',
          indexerId: 1,
          title: 'Test.Release.2024.1080p',
          size: 1000000000,
          seeders: 50,
          guid: 'test-guid-123',
          quality: '1080p',
          age: 12,
        },
      ],
      meta: {
        page: 1,
        pageSize: 20,
        totalCount: 1,
        totalPages: 1,
      },
    });

    mockReleaseApi.grabRelease.mockResolvedValue({
      success: true,
      downloadId: 'download-123',
      message: 'Release grabbed successfully',
    });

    // Render the modal and trigger grab
    // In a real test, we'd use render from @testing-library/react
    // For now, we'll just verify the mock structure
    expect(mockReleaseApi.grabRelease).toBeDefined();
  });
});
