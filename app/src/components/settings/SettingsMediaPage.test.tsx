import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SettingsMediaPage } from '@/App';

vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(),
}));

vi.mock('@/components/primitives/FilesystemBrowser', () => ({
  FilesystemBrowser: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="filesystem-browser" /> : null,
}));

const mockPushToast = vi.fn();
vi.mock('@/components/providers/ToastProvider', () => ({
  useToast: () => ({ pushToast: mockPushToast }),
}));

import { getApiClients } from '@/lib/api/client';

function createMockApi(movieRootFolder = '', tvRootFolder = '') {
  return {
    mediaManagementApi: {
      get: vi.fn().mockResolvedValue({ movieRootFolder, tvRootFolder }),
      save: vi.fn().mockResolvedValue({ movieRootFolder, tvRootFolder }),
    },
    filesystemApi: {
      list: vi.fn().mockResolvedValue({ writable: true, entries: [] }),
    },
  };
}

describe('SettingsMediaPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders movie root folder input with folder icon and Validate button', async () => {
    (getApiClients as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockApi('/media/movies'),
    );

    render(<SettingsMediaPage />);

    await waitFor(() => {
      expect(screen.getByText('Movie Root Folder')).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue('/media/movies')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Browse movie root folder' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Validate movie root folder' })).toBeInTheDocument();
  });

  it('renders TV root folder input with folder icon and Validate button', async () => {
    (getApiClients as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockApi('', '/media/tv'),
    );

    render(<SettingsMediaPage />);

    await waitFor(() => {
      expect(screen.getByText('TV Root Folder')).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue('/media/tv')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Browse TV root folder' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Validate TV root folder' })).toBeInTheDocument();
  });

  it('values persist after successful save', async () => {
    const savedSettings = { movieRootFolder: '/movies', tvRootFolder: '/tv' };
    const mockApi = createMockApi();
    mockApi.mediaManagementApi.save = vi.fn().mockResolvedValue(savedSettings);
    (getApiClients as ReturnType<typeof vi.fn>).mockReturnValue(mockApi);

    render(<SettingsMediaPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save Media Settings' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save Media Settings' }));

    await waitFor(() => {
      expect(mockApi.mediaManagementApi.save).toHaveBeenCalled();
      expect(mockPushToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'success' }),
      );
    });

    expect(screen.getByDisplayValue('/movies')).toBeInTheDocument();
    expect(screen.getByDisplayValue('/tv')).toBeInTheDocument();
  });

  it('shows writable status after validating movie root folder', async () => {
    (getApiClients as ReturnType<typeof vi.fn>).mockReturnValue(createMockApi('/media/movies'));

    render(<SettingsMediaPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Validate movie root folder' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Validate movie root folder' }));

    await waitFor(() => {
      expect(screen.getByText('✓ Writable')).toBeInTheDocument();
    });
  });

  it('shows writable status after validating TV root folder', async () => {
    (getApiClients as ReturnType<typeof vi.fn>).mockReturnValue(createMockApi('', '/media/tv'));

    render(<SettingsMediaPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Validate TV root folder' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Validate TV root folder' }));

    await waitFor(() => {
      // Could be multiple Writable statuses if both validated — check at least one
      expect(screen.getAllByText('✓ Writable').length).toBeGreaterThan(0);
    });
  });
});
