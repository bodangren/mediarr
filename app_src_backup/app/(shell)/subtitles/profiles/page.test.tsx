import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from '@/components/shell/AppShell';
import { getApiClients } from '@/lib/api/client';
import LanguageProfilesPage from './page';
import type { LanguageProfile } from '@/lib/api/languageProfilesApi';

// Mock eventsApi
const mockEventsApi = {
  connectionState: 'disconnected' as const,
  onStateChange: vi.fn(() => () => {}),
};

// Mock the API clients
vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(() => ({
    languageProfilesApi: {
      listProfiles: vi.fn(),
      createProfile: vi.fn(),
      updateProfile: vi.fn(),
      deleteProfile: vi.fn(),
    },
    eventsApi: mockEventsApi,
  })),
}));

// Mock useToast
vi.mock('@/components/providers/ToastProvider', () => ({
  useToast: vi.fn(() => ({
    pushToast: vi.fn(),
  })),
}));

// Create a test QueryClient
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

function renderPage() {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AppShell pathname="/subtitles/profiles">
        <LanguageProfilesPage />
      </AppShell>
    </QueryClientProvider>,
  );
}

describe('language profiles page', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders page with header and add button', async () => {
    vi.mocked(getApiClients).mockReturnValue({
      languageProfilesApi: {
        listProfiles: vi.fn().mockResolvedValue([]),
        createProfile: vi.fn(),
        updateProfile: vi.fn(),
        deleteProfile: vi.fn(),
      },
      eventsApi: mockEventsApi,
    } as any);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Language Profiles' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add New Profile' })).toBeInTheDocument();
      expect(screen.getByText('Manage language profiles for controlling subtitle download preferences and quality settings.')).toBeInTheDocument();
    });
  });

  it('shows empty state when no profiles exist', async () => {
    vi.mocked(getApiClients).mockReturnValue({
      languageProfilesApi: {
        listProfiles: vi.fn().mockResolvedValue([]),
        createProfile: vi.fn(),
        updateProfile: vi.fn(),
        deleteProfile: vi.fn(),
      },
      eventsApi: mockEventsApi,
    } as any);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('No language profiles configured. Click "Add New Profile" to create one.')).toBeInTheDocument();
    });
  });

  it('displays list of language profiles', async () => {
    const mockProfiles: LanguageProfile[] = [
      {
        id: 1,
        name: 'English & Spanish',
        languages: [
          { languageCode: 'en', isForced: false, isHi: false, audioExclude: false, score: 50 },
          { languageCode: 'es', isForced: true, isHi: false, audioExclude: false, score: 75 },
        ],
        cutoff: 'en',
        upgradeAllowed: true,
        mustContain: ['BluRay'],
        mustNotContain: [],
      },
      {
        id: 2,
        name: 'French Only',
        languages: [
          { languageCode: 'fr', isForced: false, isHi: true, audioExclude: false, score: 100 },
        ],
        cutoff: '',
        upgradeAllowed: false,
        mustContain: [],
        mustNotContain: ['HC'],
      },
    ];

    vi.mocked(getApiClients).mockReturnValue({
      languageProfilesApi: {
        listProfiles: vi.fn().mockResolvedValue(mockProfiles),
        createProfile: vi.fn(),
        updateProfile: vi.fn(),
        deleteProfile: vi.fn(),
      },
      eventsApi: mockEventsApi,
    } as any);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('English & Spanish')).toBeInTheDocument();
      expect(screen.getByText('French Only')).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: 'Edit' }).length).toBe(2);
      expect(screen.getAllByRole('button', { name: 'Delete' }).length).toBe(2);
    });
  });

  it('opens add profile modal when Add New Profile is clicked', async () => {
    vi.mocked(getApiClients).mockReturnValue({
      languageProfilesApi: {
        listProfiles: vi.fn().mockResolvedValue([]),
        createProfile: vi.fn(),
        updateProfile: vi.fn(),
        deleteProfile: vi.fn(),
      },
      eventsApi: mockEventsApi,
    } as any);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Add New Profile' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add New Profile' }));

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Add Language Profile' })).toBeInTheDocument();
      expect(screen.getByLabelText('Profile Name')).toBeInTheDocument();
      expect(screen.getByText('Languages')).toBeInTheDocument();
      expect(screen.getByText('Cutoff Language')).toBeInTheDocument();
    });
  });

  it('opens edit profile modal when Edit is clicked', async () => {
    const mockProfile: LanguageProfile = {
      id: 1,
      name: 'Test Profile',
      languages: [
        { languageCode: 'en', isForced: false, isHi: false, audioExclude: false, score: 50 },
      ],
      cutoff: 'en',
      upgradeAllowed: true,
      mustContain: [],
      mustNotContain: [],
    };

    vi.mocked(getApiClients).mockReturnValue({
      languageProfilesApi: {
        listProfiles: vi.fn().mockResolvedValue([mockProfile]),
        createProfile: vi.fn(),
        updateProfile: vi.fn(),
        deleteProfile: vi.fn(),
      },
      eventsApi: mockEventsApi,
    } as any);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Edit Language Profile' })).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Profile')).toBeInTheDocument();
    });
  });

  it('opens delete confirmation modal when Delete is clicked', async () => {
    const mockProfile: LanguageProfile = {
      id: 1,
      name: 'Test Profile',
      languages: [
        { languageCode: 'en', isForced: false, isHi: false, audioExclude: false, score: 50 },
      ],
      cutoff: 'en',
      upgradeAllowed: true,
      mustContain: [],
      mustNotContain: [],
    };

    vi.mocked(getApiClients).mockReturnValue({
      languageProfilesApi: {
        listProfiles: vi.fn().mockResolvedValue([mockProfile]),
        createProfile: vi.fn(),
        updateProfile: vi.fn(),
        deleteProfile: vi.fn(),
      },
      eventsApi: mockEventsApi,
    } as any);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Delete Language Profile' })).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to delete the language profile/)).toBeInTheDocument();
      expect(screen.getByText('Test Profile')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Delete Profile' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });
  });

  it('displays profile details correctly', async () => {
    const mockProfile: LanguageProfile = {
      id: 1,
      name: 'English & French',
      languages: [
        { languageCode: 'en', isForced: false, isHi: false, audioExclude: false, score: 50 },
        { languageCode: 'fr', isForced: true, isHi: true, audioExclude: false, score: 75 },
      ],
      cutoff: 'en',
      upgradeAllowed: true,
      mustContain: ['BluRay', 'REMUX'],
      mustNotContain: ['HC'],
    };

    vi.mocked(getApiClients).mockReturnValue({
      languageProfilesApi: {
        listProfiles: vi.fn().mockResolvedValue([mockProfile]),
        createProfile: vi.fn(),
        updateProfile: vi.fn(),
        deleteProfile: vi.fn(),
      },
      eventsApi: mockEventsApi,
    } as any);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('English & French')).toBeInTheDocument();
      expect(screen.getByText('Cutoff:')).toBeInTheDocument();
      expect(screen.getByText('English (en)')).toBeInTheDocument();
      expect(screen.getByText('Upgrade Allowed:')).toBeInTheDocument();
      expect(screen.getByText('Yes')).toBeInTheDocument();
      expect(screen.getByText('Must Contain:')).toBeInTheDocument();
      expect(screen.getByText('BluRay, REMUX')).toBeInTheDocument();
      expect(screen.getByText('Must Not Contain:')).toBeInTheDocument();
      expect(screen.getByText('HC')).toBeInTheDocument();
    });
  });

  it('shows loading state', async () => {
    vi.mocked(getApiClients).mockReturnValue({
      languageProfilesApi: {
        listProfiles: vi.fn(() => new Promise(() => {})), // Never resolves
        createProfile: vi.fn(),
        updateProfile: vi.fn(),
        deleteProfile: vi.fn(),
      },
      eventsApi: mockEventsApi,
    } as any);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Loading language profiles...')).toBeInTheDocument();
    });
  });

  it('shows error state when API fails', async () => {
    vi.mocked(getApiClients).mockReturnValue({
      languageProfilesApi: {
        listProfiles: vi.fn().mockRejectedValue(new Error('API Error')),
        createProfile: vi.fn(),
        updateProfile: vi.fn(),
        deleteProfile: vi.fn(),
      },
      eventsApi: mockEventsApi,
    } as any);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Failed to load language profiles. Please try again later.')).toBeInTheDocument();
    });
  });

  it('closes add modal on cancel', async () => {
    vi.mocked(getApiClients).mockReturnValue({
      languageProfilesApi: {
        listProfiles: vi.fn().mockResolvedValue([]),
        createProfile: vi.fn(),
        updateProfile: vi.fn(),
        deleteProfile: vi.fn(),
      },
      eventsApi: mockEventsApi,
    } as any);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Add New Profile' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add New Profile' }));

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Add Language Profile' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Add Language Profile' })).not.toBeInTheDocument();
    });
  });

  it('closes delete modal on cancel', async () => {
    const mockProfile: LanguageProfile = {
      id: 1,
      name: 'Test Profile',
      languages: [
        { languageCode: 'en', isForced: false, isHi: false, audioExclude: false, score: 50 },
      ],
      cutoff: 'en',
      upgradeAllowed: true,
      mustContain: [],
      mustNotContain: [],
    };

    vi.mocked(getApiClients).mockReturnValue({
      languageProfilesApi: {
        listProfiles: vi.fn().mockResolvedValue([mockProfile]),
        createProfile: vi.fn(),
        updateProfile: vi.fn(),
        deleteProfile: vi.fn(),
      },
      eventsApi: mockEventsApi,
    } as any);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Delete Language Profile' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Cancel' })[1]); // Second cancel button (in modal)

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Delete Language Profile' })).not.toBeInTheDocument();
    });
  });
});
