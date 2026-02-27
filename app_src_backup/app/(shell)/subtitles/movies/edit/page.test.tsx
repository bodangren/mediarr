import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MovieMassEditPage from './page';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';

// Mock dependencies
const mockMediaApi = {
  listMovies: vi.fn(),
};

const mockLanguageProfilesApi = {
  listProfiles: vi.fn(),
};

vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(() => ({
    mediaApi: mockMediaApi,
    languageProfilesApi: mockLanguageProfilesApi,
  })),
}));

vi.mock('@/components/providers/ToastProvider', () => ({
  useToast: vi.fn(() => ({
    pushToast: vi.fn(),
  })),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}));

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('MovieMassEditPage', () => {
  beforeEach(() => {
    mockMediaApi.listMovies.mockReset();
    mockLanguageProfilesApi.listProfiles.mockReset();
  });

  it('should render page header', async () => {
    mockMediaApi.listMovies.mockResolvedValue({
      items: [
        { id: 1, title: 'Test Movie 1', year: 2024 },
        { id: 2, title: 'Test Movie 2', year: 2023 },
      ],
      meta: { totalCount: 2 },
    });

    mockLanguageProfilesApi.listProfiles.mockResolvedValue([
      { id: 1, name: 'English', languages: [], cutoff: '', upgradeAllowed: false, mustContain: [], mustNotContain: [] },
      { id: 2, name: 'Spanish', languages: [], cutoff: '', upgradeAllowed: false, mustContain: [], mustNotContain: [] },
    ]);

    renderWithProviders(<MovieMassEditPage />);

    expect(screen.getByText('Mass Edit Movies')).toBeInTheDocument();
    expect(screen.getByText('Select movies to update their language profiles in bulk.')).toBeInTheDocument();
  });

  it('should render language profile select', async () => {
    mockMediaApi.listMovies.mockResolvedValue({
      items: [],
      meta: { totalCount: 0 },
    });

    mockLanguageProfilesApi.listProfiles.mockResolvedValue([
      { id: 1, name: 'English', languages: [], cutoff: '', upgradeAllowed: false, mustContain: [], mustNotContain: [] },
    ]);

    renderWithProviders(<MovieMassEditPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Language Profile:')).toBeInTheDocument();
      expect(screen.getByText('Select a profile...')).toBeInTheDocument();
    });
  });

  it('should render select all checkbox', async () => {
    mockMediaApi.listMovies.mockResolvedValue({
      items: [],
      meta: { totalCount: 0 },
    });

    mockLanguageProfilesApi.listProfiles.mockResolvedValue([]);

    renderWithProviders(<MovieMassEditPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Select all movies')).toBeInTheDocument();
      expect(screen.getByText('Select All')).toBeInTheDocument();
    });
  });

  it('should render movies table', async () => {
    mockMediaApi.listMovies.mockResolvedValue({
      items: [
        { id: 1, title: 'Test Movie', year: 2024 },
      ],
      meta: { totalCount: 1 },
    });

    mockLanguageProfilesApi.listProfiles.mockResolvedValue([]);

    renderWithProviders(<MovieMassEditPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Movie')).toBeInTheDocument();
      expect(screen.getByText('2024')).toBeInTheDocument();
    });
  });

  it('should show empty state when no movies', async () => {
    mockMediaApi.listMovies.mockResolvedValue({
      items: [],
      meta: { totalCount: 0 },
    });

    mockLanguageProfilesApi.listProfiles.mockResolvedValue([]);

    renderWithProviders(<MovieMassEditPage />);

    await waitFor(() => {
      expect(screen.getByText('No movies found')).toBeInTheDocument();
      expect(screen.getByText('Add some movies to your library to manage subtitles.')).toBeInTheDocument();
    });
  });

  it('should handle movie selection', async () => {
    const user = userEvent.setup();
    mockMediaApi.listMovies.mockResolvedValue({
      items: [
        { id: 1, title: 'Test Movie', year: 2024 },
      ],
      meta: { totalCount: 1 },
    });

    mockLanguageProfilesApi.listProfiles.mockResolvedValue([]);

    renderWithProviders(<MovieMassEditPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Select Test Movie')).toBeInTheDocument();
    });

    const checkbox = screen.getByLabelText('Select Test Movie');
    await user.click(checkbox);

    await waitFor(() => {
      expect(checkbox).toBeChecked();
      expect(screen.getByText('1 movie selected')).toBeInTheDocument();
    });
  });

  it('should handle select all', async () => {
    const user = userEvent.setup();
    mockMediaApi.listMovies.mockResolvedValue({
      items: [
        { id: 1, title: 'Test Movie 1', year: 2024 },
        { id: 2, title: 'Test Movie 2', year: 2023 },
      ],
      meta: { totalCount: 2 },
    });

    mockLanguageProfilesApi.listProfiles.mockResolvedValue([]);

    renderWithProviders(<MovieMassEditPage />);

    // Wait for the select all checkbox to appear
    const selectAllCheckbox = await screen.findByLabelText('Select all movies');

    // Verify it's initially unchecked
    expect(selectAllCheckbox).not.toBeChecked();

    // Click it
    await user.click(selectAllCheckbox);

    // Wait for the "2 movies selected" text to appear, which confirms the state updated
    await waitFor(() => {
      expect(screen.getByText('2 movies selected')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Now verify the select all checkbox is checked
    expect(selectAllCheckbox).toBeChecked();

    // Verify individual movie checkboxes are checked
    expect(screen.getByLabelText('Select Test Movie 1')).toBeChecked();
    expect(screen.getByLabelText('Select Test Movie 2')).toBeChecked();
  });

  it('should render apply changes and cancel buttons', async () => {
    mockMediaApi.listMovies.mockResolvedValue({
      items: [],
      meta: { totalCount: 0 },
    });

    mockLanguageProfilesApi.listProfiles.mockResolvedValue([]);

    renderWithProviders(<MovieMassEditPage />);

    await waitFor(() => {
      expect(screen.getByText('Apply Changes')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  it('should disable apply changes when no movies selected', async () => {
    mockMediaApi.listMovies.mockResolvedValue({
      items: [],
      meta: { totalCount: 0 },
    });

    mockLanguageProfilesApi.listProfiles.mockResolvedValue([]);

    renderWithProviders(<MovieMassEditPage />);

    await waitFor(() => {
      const applyButton = screen.getByText('Apply Changes');
      expect(applyButton).toBeDisabled();
    });
  });

  it('should disable apply changes when no profile selected', async () => {
    const user = userEvent.setup();
    mockMediaApi.listMovies.mockResolvedValue({
      items: [
        { id: 1, title: 'Test Movie', year: 2024 },
      ],
      meta: { totalCount: 1 },
    });

    mockLanguageProfilesApi.listProfiles.mockResolvedValue([]);

    renderWithProviders(<MovieMassEditPage />);

    const checkbox = await screen.findByLabelText('Select Test Movie');
    await user.click(checkbox);

    await waitFor(() => {
      const applyButton = screen.getByText('Apply Changes');
      expect(applyButton).toBeDisabled();
    });
  });

  it('should disable apply changes when no profile ID selected', async () => {
    const user = userEvent.setup();
    mockMediaApi.listMovies.mockResolvedValue({
      items: [
        { id: 1, title: 'Test Movie', year: 2024 },
      ],
      meta: { totalCount: 1 },
    });

    mockLanguageProfilesApi.listProfiles.mockResolvedValue([
      { id: 1, name: 'English', languages: [], cutoff: '', upgradeAllowed: false, mustContain: [], mustNotContain: [] },
    ]);

    renderWithProviders(<MovieMassEditPage />);

    const checkbox = await screen.findByLabelText('Select Test Movie');
    await user.click(checkbox);

    await waitFor(() => {
      const applyButton = screen.getByText('Apply Changes');
      expect(applyButton).toBeDisabled();
    });
  });

  it('should show tooltip when apply changes is disabled', async () => {
    mockMediaApi.listMovies.mockResolvedValue({
      items: [],
      meta: { totalCount: 0 },
    });

    mockLanguageProfilesApi.listProfiles.mockResolvedValue([]);

    renderWithProviders(<MovieMassEditPage />);

    await waitFor(() => {
      const applyButton = screen.getByText('Apply Changes');
      expect(applyButton).toHaveAttribute('title', 'Movie language profile update requires backend support');
    });
  });

  it('should handle language profile selection', async () => {
    mockMediaApi.listMovies.mockResolvedValue({
      items: [],
      meta: { totalCount: 0 },
    });

    mockLanguageProfilesApi.listProfiles.mockResolvedValue([
      { id: 1, name: 'English', languages: [], cutoff: '', upgradeAllowed: false, mustContain: [], mustNotContain: [] },
      { id: 2, name: 'Spanish', languages: [], cutoff: '', upgradeAllowed: false, mustContain: [], mustNotContain: [] },
    ]);

    renderWithProviders(<MovieMassEditPage />);

    const select = await screen.findByLabelText('Language Profile:');

    // Verify select is present
    expect(select).toBeInTheDocument();
    expect(select.tagName).toBe('SELECT');

    // Verify default option is present
    const defaultOption = screen.getByText('Select a profile...');
    expect(defaultOption).toBeInTheDocument();

    // Verify the mock was called
    expect(mockLanguageProfilesApi.listProfiles).toHaveBeenCalled();
  });
});
