import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { QualityProfileItem } from '@/lib/api/qualityProfileApi';

// Mock react-dnd used inside AddProfileModal
vi.mock('react-dnd', () => ({
  DndProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useDrag: () => [{ isDragging: false }, vi.fn(), vi.fn()],
  useDrop: () => [{ isOver: false }, vi.fn()],
}));
vi.mock('react-dnd-html5-backend', () => ({ HTML5Backend: {} }));

const mockProfile: QualityProfileItem = {
  id: 42,
  name: 'Ultra-HD',
  cutoff: 10,
  items: [
    { quality: { id: 10, name: 'Bluray-2160p', resolution: 2160, source: 'Bluray' }, allowed: true },
    { quality: { id: 9, name: 'WEB-DL 2160p', resolution: 2160, source: 'Web' }, allowed: true },
  ],
};

const mockListFn = vi.fn();
const mockUpdateFn = vi.fn();
const mockCustomFormatListFn = vi.fn();

vi.mock('@/lib/api/client', () => ({
  getApiClients: () => ({
    qualityProfileApi: {
      list: mockListFn,
      get: vi.fn(),
      create: vi.fn().mockResolvedValue(mockProfile),
      update: mockUpdateFn,
      delete: vi.fn().mockResolvedValue({ id: 42 }),
    },
    customFormatApi: {
      list: mockCustomFormatListFn,
      create: vi.fn(),
      delete: vi.fn(),
    },
  }),
}));

// SettingsProfilesPage is exported from App.tsx for testability
import { SettingsProfilesPage } from '@/App';

describe('SettingsProfilesPage — edit flow', () => {
  beforeEach(() => {
    mockListFn.mockResolvedValue([mockProfile]);
    mockUpdateFn.mockResolvedValue(mockProfile);
    mockCustomFormatListFn.mockResolvedValue([]);
  });

  it('renders a profile row for each loaded profile', async () => {
    render(<SettingsProfilesPage />);
    await waitFor(() => expect(screen.getByDisplayValue('Ultra-HD')).toBeInTheDocument());
  });

  it('each profile row has an Edit button', async () => {
    render(<SettingsProfilesPage />);
    await waitFor(() => screen.getByDisplayValue('Ultra-HD'));
    expect(screen.getByRole('button', { name: /^edit$/i })).toBeInTheDocument();
  });

  it('clicking Edit opens AddProfileModal with profile name pre-filled', async () => {
    render(<SettingsProfilesPage />);
    await waitFor(() => screen.getByDisplayValue('Ultra-HD'));
    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }));
    const nameInput = await screen.findByLabelText(/profile name/i) as HTMLInputElement;
    expect(nameInput.value).toBe('Ultra-HD');
  });

  it('clicking Edit opens modal with correct quality items', async () => {
    render(<SettingsProfilesPage />);
    await waitFor(() => screen.getByDisplayValue('Ultra-HD'));
    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }));
    await screen.findByLabelText(/toggle Bluray-2160p/i);
    expect(screen.getByLabelText(/toggle WEB-DL 2160p/i)).toBeInTheDocument();
  });

  it('submitting edit modal calls qualityProfileApi.update with correct id and payload', async () => {
    render(<SettingsProfilesPage />);
    await waitFor(() => screen.getByDisplayValue('Ultra-HD'));
    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }));
    await screen.findByRole('button', { name: /save changes/i });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() =>
      expect(mockUpdateFn).toHaveBeenCalledWith(
        42,
        expect.objectContaining({ name: 'Ultra-HD', cutoff: 10 }),
      ),
    );
  });

  it('modal closes after a successful save', async () => {
    render(<SettingsProfilesPage />);
    await waitFor(() => screen.getByDisplayValue('Ultra-HD'));
    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }));
    await screen.findByRole('button', { name: /save changes/i });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument(),
    );
  });
});
