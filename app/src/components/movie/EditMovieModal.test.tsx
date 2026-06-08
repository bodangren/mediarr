import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { EditMovieModal } from './EditMovieModal';
import { ToastProvider } from '@/components/providers/ToastProvider';
import type { Movie } from '@/lib/api/movieApi';

const mockUpdate = vi.fn();

vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(() => ({
    movieApi: {
      update: mockUpdate,
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

const baseMovie: Movie = {
  id: 42,
  title: 'Original Title',
  year: 2024,
  monitored: true,
  qualityProfileId: 1,
  added: '2024-01-01T00:00:00.000Z',
  path: '/movies/Original Title (2024)',
  overview: 'An original overview',
  studio: 'Original Studio',
  certification: 'PG-13',
  genres: ['Action', 'Drama'],
};

describe('EditMovieModal', () => {
  const onClose = vi.fn();
  const onSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockResolvedValue({ ...baseMovie });
  });

  it('renders with pre-filled movie data', () => {
    render(
      <EditMovieModal isOpen movie={baseMovie} onClose={onClose} onSave={onSave} />,
      { wrapper },
    );

    expect(screen.getByDisplayValue('Original Title')).toBeInTheDocument();
    expect(screen.getByDisplayValue('/movies/Original Title (2024)')).toBeInTheDocument();
    expect(screen.getByDisplayValue('An original overview')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Original Studio')).toBeInTheDocument();
    expect(screen.getByDisplayValue('PG-13')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Action,Drama')).toBeInTheDocument();
  });

  it('calls movieApi.update with changed fields on Save and triggers onSave', async () => {
    const user = userEvent.setup();
    render(
      <EditMovieModal isOpen movie={baseMovie} onClose={onClose} onSave={onSave} />,
      { wrapper },
    );

    const titleInput = screen.getByLabelText('Title');
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Title');

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledTimes(1);
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ title: 'Updated Title' }),
    );
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onClose on Cancel', async () => {
    const user = userEvent.setup();
    render(
      <EditMovieModal isOpen movie={baseMovie} onClose={onClose} onSave={onSave} />,
      { wrapper },
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('validates required fields before save', async () => {
    const user = userEvent.setup();
    render(
      <EditMovieModal isOpen movie={baseMovie} onClose={onClose} onSave={onSave} />,
      { wrapper },
    );

    const titleInput = screen.getByLabelText('Title');
    await user.clear(titleInput);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeInTheDocument();
    });
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });
});
