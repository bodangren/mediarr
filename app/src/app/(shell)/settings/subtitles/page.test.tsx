import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SubtitlesSettingsPage from './page';

// Mock API clients
vi.mock('@/lib/api/client', () => ({
  getApiClients: () => ({
    subtitleSettingsApi: {
      get: () => Promise.resolve({
        autoDownload: true,
        downloadOnUpgrade: true,
        minimumScore: 60,
        maxResultsPerLanguage: 10,
        useCustomSubtitleFolder: false,
        customSubtitleFolder: '',
        subtitleFolderMode: 'video' as const,
        fileNamingFormat: '{movie_name}.{language_code}.{extension}',
        defaultLanguageProfileId: 1,
        useEmbeddedSubtitles: false,
        ignoreEmbeddedForHi: true,
      }),
      update: (values: any) => Promise.resolve(values),
    },
  }),
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

describe('SubtitlesSettingsPage', () => {
  const renderPage = () => {
    const client = createTestQueryClient();
    return render(
      <QueryClientProvider client={client}>
        <SubtitlesSettingsPage />
      </QueryClientProvider>
    );
  };

  it('renders page with header', () => {
    renderPage();
    expect(screen.getByText('Subtitle Settings')).toBeInTheDocument();
    expect(
      screen.getByText('Configure automatic subtitle downloads and file handling.')
    ).toBeInTheDocument();
  });

  it('renders general settings section', async () => {
    renderPage();
    expect(await screen.findByText('General')).toBeInTheDocument();
    expect(screen.getByLabelText('Download Automatically')).toBeInTheDocument();
    expect(screen.getByLabelText('Download on Upgrade')).toBeInTheDocument();
    expect(screen.getByLabelText('Minimum Score')).toBeInTheDocument();
    expect(screen.getByLabelText('Maximum Results Per Language')).toBeInTheDocument();
  });

  it('renders file settings section', () => {
    renderPage();
    expect(screen.getByText('File Settings')).toBeInTheDocument();
    expect(screen.getByLabelText('Save alongside video file')).toBeInTheDocument();
    expect(screen.getByLabelText('Save in custom folder')).toBeInTheDocument();
    expect(screen.getByLabelText('File Naming Format')).toBeInTheDocument();
  });

  it('renders language settings section', () => {
    renderPage();
    expect(screen.getByText('Language Settings')).toBeInTheDocument();
    expect(screen.getByLabelText('Use Embedded Subtitles')).toBeInTheDocument();
    expect(screen.getByLabelText('Ignore Embedded for Hearing Impaired')).toBeInTheDocument();
    expect(screen.getByLabelText('Default Language Profile')).toBeInTheDocument();
  });

  it('shows custom subtitle folder input when custom mode is selected', async () => {
    renderPage();
    const customRadio = screen.getByLabelText('Save in custom folder');
    customRadio.click();

    expect(await screen.findByLabelText('Custom Subtitle Folder')).toBeInTheDocument();
  });

  it('has save button', () => {
    renderPage();
    expect(screen.getByText('Save Subtitle Settings')).toBeInTheDocument();
  });
});
