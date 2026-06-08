import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { MovieBulkEditModal } from './MovieBulkEditModal';
import { ToastProvider } from '@/components/providers/ToastProvider';

const mockListQualityProfiles = vi.fn();
const mockGetRootFolders = vi.fn();
const mockBulkUpdate = vi.fn();
const mockApplyOrganize = vi.fn();

vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(() => ({
    qualityProfileApi: {
      list: mockListQualityProfiles,
    },
    movieApi: {
      getRootFolders: mockGetRootFolders,
      bulkUpdate: mockBulkUpdate,
      applyOrganize: mockApplyOrganize,
    },
  })),
}));

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}

describe('MovieBulkEditModal', () => {
  const onClose = vi.fn();
  const selectedMovieIds = [1, 2, 3];
  const selectedMovieTitles = ['Movie A', 'Movie B', 'Movie C'];

  beforeEach(() => {
    vi.clearAllMocks();
    mockListQualityProfiles.mockResolvedValue([
      { id: 1, name: 'HD-1080p' },
      { id: 2, name: 'UltraHD' },
    ]);
    mockGetRootFolders.mockResolvedValue({ rootFolders: ['/movies'] });
    mockBulkUpdate.mockResolvedValue({ updated: 3, failed: 0, errors: [] });
    // JSDOM does not implement window.confirm; default to auto-confirm.
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockApplyOrganize.mockResolvedValue({ renamed: 3, failed: 0, errors: [] });
  });

  it('renders with selected movie count and titles', async () => {
    render(
      <MovieBulkEditModal
        isOpen
        onClose={onClose}
        selectedMovieIds={selectedMovieIds}
        selectedMovieTitles={selectedMovieTitles}
      />,
      { wrapper },
    );

    expect(screen.getByText('Edit 3 Movies')).toBeInTheDocument();
    expect(screen.getByText('Movie A, Movie B, Movie C')).toBeInTheDocument();
    await waitFor(() => {
      expect(mockListQualityProfiles).toHaveBeenCalledTimes(1);
    });
  });

  it('calls bulkUpdate with changes for all selected movies on Apply', async () => {
    const user = userEvent.setup();
    render(
      <MovieBulkEditModal
        isOpen
        onClose={onClose}
        selectedMovieIds={selectedMovieIds}
        selectedMovieTitles={selectedMovieTitles}
      />,
      { wrapper },
    );

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'UltraHD' })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Quality Profile'), { target: { value: '2' } });
    await user.click(screen.getByRole('button', { name: 'Preview Changes' }));

    expect(await screen.findByText('Quality Profile: UltraHD')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Apply Changes' }));

    await waitFor(() => {
      expect(mockBulkUpdate).toHaveBeenCalledTimes(1);
    });

    expect(mockBulkUpdate).toHaveBeenCalledWith(
      [1, 2, 3],
      expect.objectContaining({ qualityProfileId: 2 }),
    );
  });

  it('validates at least one change is made before applying', async () => {
    const user = userEvent.setup();
    render(
      <MovieBulkEditModal
        isOpen
        onClose={onClose}
        selectedMovieIds={selectedMovieIds}
        selectedMovieTitles={selectedMovieTitles}
      />,
      { wrapper },
    );

    await waitFor(() => {
      expect(mockListQualityProfiles).toHaveBeenCalled();
    });

    await user.click(screen.getByRole('button', { name: 'Preview Changes' }));

    expect(await screen.findByText('No changes selected. Please modify at least one field.')).toBeInTheDocument();

    const applyButton = screen.getByRole('button', { name: 'Apply Changes' });
    expect(applyButton).toBeDisabled();

    expect(mockBulkUpdate).not.toHaveBeenCalled();
  });
});
