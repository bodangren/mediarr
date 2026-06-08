import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { OrganizePreviewModal } from './OrganizePreviewModal';
import { ToastProvider } from '@/components/providers/ToastProvider';

const mockPreviewOrganize = vi.fn();
const mockApplyOrganize = vi.fn();

vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(() => ({
    movieApi: {
      previewOrganize: mockPreviewOrganize,
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

const mockPreviews = [
  {
    movieId: 1,
    movieTitle: 'Movie A',
    currentPath: '/movies/Movie A (2024)/old.mkv',
    newPath: '/movies/Movie A (2024)/Movie A.mkv',
    isNewPath: true,
  },
  {
    movieId: 2,
    movieTitle: 'Movie B',
    currentPath: '/movies/Movie B (2023)/Movie B.mkv',
    newPath: '/movies/Movie B (2023)/Movie B.mkv',
    isNewPath: false,
  },
  {
    movieId: 3,
    movieTitle: 'Movie C',
    currentPath: '/movies/Movie C (2022)/old-name.mkv',
    newPath: '/movies/Movie C (2022)/Movie C.mkv',
    isNewPath: true,
  },
];

describe('OrganizePreviewModal', () => {
  const onClose = vi.fn();
  const onComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockPreviewOrganize.mockResolvedValue({ previews: mockPreviews });
    mockApplyOrganize.mockResolvedValue({ renamed: 2, failed: 0, errors: [] });
  });

  it('renders file move preview list with unchanged-count note', async () => {
    render(
      <OrganizePreviewModal isOpen movieIds={[1, 2, 3]} onClose={onClose} onComplete={onComplete} />,
      { wrapper },
    );

    await waitFor(() => {
      expect(mockPreviewOrganize).toHaveBeenCalledWith({ movieIds: [1, 2, 3] });
    });

    expect(await screen.findByText('Movie A')).toBeInTheDocument();
    expect(screen.getByText('Movie C')).toBeInTheDocument();
    expect(screen.getByText('1 file(s) already follow the naming convention.')).toBeInTheDocument();

    const renameButton = screen.getByRole('button', { name: /Rename 2 File/i });
    expect(renameButton).toBeInTheDocument();
  });

  it('calls organize apply endpoint on Confirm', async () => {
    const user = userEvent.setup();
    render(
      <OrganizePreviewModal isOpen movieIds={[1, 2, 3]} onClose={onClose} onComplete={onComplete} />,
      { wrapper },
    );

    const renameButton = await screen.findByRole('button', { name: /Rename 2 File/i });
    await user.click(renameButton);

    await waitFor(() => {
      expect(mockApplyOrganize).toHaveBeenCalledTimes(1);
    });
    expect(mockApplyOrganize).toHaveBeenCalledWith({ movieIds: [1, 2, 3] });

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onClose on Cancel', async () => {
    const user = userEvent.setup();
    render(
      <OrganizePreviewModal isOpen movieIds={[1, 2, 3]} onClose={onClose} onComplete={onComplete} />,
      { wrapper },
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockApplyOrganize).not.toHaveBeenCalled();
    expect(mockPreviewOrganize).toHaveBeenCalledTimes(1);
  });
});
