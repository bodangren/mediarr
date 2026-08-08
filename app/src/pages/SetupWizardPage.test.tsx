import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { SetupWizardPage } from './SetupWizardPage';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/components/primitives/FilesystemBrowser', () => ({
  FilesystemBrowser: ({ isOpen, onSelect }: { isOpen: boolean; onSelect: (path: string) => void }) => (
    isOpen
      ? <button type="button" onClick={() => onSelect('/selected/path')}>Select Path</button>
      : null
  ),
}));

vi.mock('@/lib/indexer/indexerPresets', () => ({
  indexerPresets: [
    {
      id: '1337x',
      name: '1337x',
      implementation: 'Cardigann',
      configContract: 'CardigannSettings',
      privacy: 'Public',
      fields: [
        { name: 'definitionId', label: 'Definition ID', type: 'text', defaultValue: '1337x' },
      ],
    },
    {
      id: 'eztv',
      name: 'EZTV',
      implementation: 'Cardigann',
      configContract: 'CardigannSettings',
      privacy: 'Public',
      fields: [
        { name: 'definitionId', label: 'Definition ID', type: 'text', defaultValue: 'eztv' },
      ],
    },
  ],
}));

vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(),
}));

import { getApiClients } from '@/lib/api/client';

function createMockApi() {
  return {
    qualityProfileApi: {
      list: vi.fn().mockResolvedValue([{ id: 1, name: 'Any' }]),
    },
    mediaManagementApi: {
      save: vi.fn().mockResolvedValue({
        movieRootFolder: '/data/media/movies',
        tvRootFolder: '/data/media/tv',
      }),
    },
    settingsApi: {
      get: vi.fn().mockResolvedValue({
        torrentLimits: {
          maxActiveDownloads: 3,
          maxActiveSeeds: 3,
          globalDownloadLimitKbps: null,
          globalUploadLimitKbps: null,
          incompleteDirectory: '',
          completeDirectory: '',
        },
      }),
      update: vi.fn().mockResolvedValue({}),
    },
    indexerApi: {
      list: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
    },
    setupApi: {
      complete: vi.fn().mockResolvedValue({ isConfigured: true, completedSteps: ['complete'] }),
    },
  };
}

describe('SetupWizardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all five steps in the indicator', async () => {
    const mockApi = createMockApi();
    (getApiClients as ReturnType<typeof vi.fn>).mockReturnValue(mockApi);

    render(
      <MemoryRouter>
        <SetupWizardPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(mockApi.qualityProfileApi.list).toHaveBeenCalled();
    });

    expect(screen.getByText('1. Welcome')).toBeInTheDocument();
    expect(screen.getByText('2. Root Folders')).toBeInTheDocument();
    expect(screen.getByText('3. Indexers')).toBeInTheDocument();
    expect(screen.getByText('4. Quality Profile')).toBeInTheDocument();
    expect(screen.getByText('5. Done')).toBeInTheDocument();
  });

  it('supports guided step navigation', async () => {
    const mockApi = createMockApi();
    (getApiClients as ReturnType<typeof vi.fn>).mockReturnValue(mockApi);

    render(
      <MemoryRouter>
        <SetupWizardPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(mockApi.qualityProfileApi.list).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Continue Guided Setup' }));
    expect(screen.getByText('Root Folders')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Indexers')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Quality Profile')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Mediarr is ready')).toBeInTheDocument();
  });

  it('Just Work completes setup with defaults', async () => {
    const mockApi = createMockApi();
    const onCompleted = vi.fn();
    (getApiClients as ReturnType<typeof vi.fn>).mockReturnValue(mockApi);

    render(
      <MemoryRouter>
        <SetupWizardPage onCompleted={onCompleted} />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(mockApi.qualityProfileApi.list).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Just Work' }));

    await waitFor(() => {
      expect(mockApi.mediaManagementApi.save).toHaveBeenCalledWith({
        movieRootFolder: '/data/media/movies',
        tvRootFolder: '/data/media/tv',
      });
      expect(mockApi.settingsApi.update).toHaveBeenCalledWith(expect.objectContaining({
        torrentLimits: expect.objectContaining({
          completeDirectory: '/data/downloads/complete',
          incompleteDirectory: '/data/downloads/incomplete',
        }),
      }));
      expect(mockApi.setupApi.complete).toHaveBeenCalled();
      expect(onCompleted).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  it('guided completion redirects to dashboard', async () => {
    const mockApi = createMockApi();
    (getApiClients as ReturnType<typeof vi.fn>).mockReturnValue(mockApi);

    render(
      <MemoryRouter>
        <SetupWizardPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(mockApi.qualityProfileApi.list).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Continue Guided Setup' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByLabelText('1337x'));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Go to Dashboard' }));

    await waitFor(() => {
      expect(mockApi.indexerApi.create).toHaveBeenCalledWith(expect.objectContaining({
        name: '1337x',
        implementation: 'Cardigann',
      }));
      expect(mockApi.setupApi.complete).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  it('derives download directories from matching custom media roots', async () => {
    const mockApi = createMockApi();
    (getApiClients as ReturnType<typeof vi.fn>).mockReturnValue(mockApi);

    render(
      <MemoryRouter>
        <SetupWizardPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(mockApi.qualityProfileApi.list).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Continue Guided Setup' }));
    fireEvent.change(screen.getByRole('textbox', { name: /Movie Root Folder/ }), {
      target: { value: '/srv/mediarr/media/movies' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /TV Root Folder/ }), {
      target: { value: '/srv/mediarr/media/tv' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Go to Dashboard' }));

    await waitFor(() => {
      expect(mockApi.settingsApi.update).toHaveBeenCalledWith(expect.objectContaining({
        torrentLimits: expect.objectContaining({
          completeDirectory: '/srv/mediarr/downloads/complete',
          incompleteDirectory: '/srv/mediarr/downloads/incomplete',
        }),
      }));
    });
  });
});
