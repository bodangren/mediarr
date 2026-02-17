import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SubtitleProvidersPage from './page';
import type { SubtitleProvider } from '@/lib/api';

vi.mock('@/lib/api/client');

describe('SubtitleProvidersPage', () => {
  const mockProviders: SubtitleProvider[] = [
    {
      id: 'opensubtitles-1',
      name: 'OpenSubtitles',
      enabled: true,
      type: 'opensubtitles',
      settings: { username: 'testuser', password: 'testpass' },
      status: 'active',
    },
    {
      id: 'subscene-1',
      name: 'Subscene',
      enabled: false,
      type: 'subscene',
      settings: {},
      status: 'disabled',
    },
    {
      id: 'addic7ed-1',
      name: 'Addic7ed',
      enabled: true,
      type: 'addic7ed',
      settings: { username: 'user' },
      status: 'error',
      lastError: 'API rate limit exceeded',
    },
  ];

  it('renders page header', () => {
    render(<SubtitleProvidersPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Subtitle Providers' })).toBeInTheDocument();
    expect(
      screen.getByText('Configure and manage subtitle providers for automatic subtitle downloads.'),
    ).toBeInTheDocument();
  });

  it('renders provider table with data', async () => {
    const { subtitleProvidersApi } = await import('@/lib/api/client');
    vi.mocked(subtitleProvidersApi).listProviders.mockResolvedValue(mockProviders);

    render(<SubtitleProvidersPage />);

    await waitFor(() => {
      expect(screen.getByText('OpenSubtitles')).toBeInTheDocument();
      expect(screen.getByText('Subscene')).toBeInTheDocument();
      expect(screen.getByText('Addic7ed')).toBeInTheDocument();
    });
  });

  it('displays provider type badges', async () => {
    const { subtitleProvidersApi } = await import('@/lib/api/client');
    vi.mocked(subtitleProvidersApi).listProviders.mockResolvedValue(mockProviders);

    render(<SubtitleProvidersPage />);

    await waitFor(() => {
      expect(screen.getByText('opensubtitles')).toBeInTheDocument();
      expect(screen.getByText('subscene')).toBeInTheDocument();
      expect(screen.getByText('addic7ed')).toBeInTheDocument();
    });
  });

  it('displays provider status badges', async () => {
    const { subtitleProvidersApi } = await import('@/lib/api/client');
    vi.mocked(subtitleProvidersApi).listProviders.mockResolvedValue(mockProviders);

    render(<SubtitleProvidersPage />);

    await waitFor(() => {
      expect(screen.getByText('completed')).toBeInTheDocument();
      expect(screen.getByText('disabled')).toBeInTheDocument();
      expect(screen.getByText('error')).toBeInTheDocument();
      expect(screen.getByText('API rate limit exceeded')).toBeInTheDocument();
    });
  });

  it('displays Settings and Test action buttons', async () => {
    const { subtitleProvidersApi } = await import('@/lib/api/client');
    vi.mocked(subtitleProvidersApi).listProviders.mockResolvedValue(mockProviders);

    render(<SubtitleProvidersPage />);

    await waitFor(() => {
      const settingsButtons = screen.getAllByRole('button', { name: 'Settings' });
      const testButtons = screen.getAllByRole('button', { name: 'Test' });

      expect(settingsButtons).toHaveLength(3);
      expect(testButtons).toHaveLength(3);
    });
  });

  it('shows empty state when no providers', async () => {
    const { subtitleProvidersApi } = await import('@/lib/api/client');
    vi.mocked(subtitleProvidersApi).listProviders.mockResolvedValue([]);

    render(<SubtitleProvidersPage />);

    await waitFor(() => {
      expect(screen.getByText('No subtitle providers configured')).toBeInTheDocument();
      expect(
        screen.getByText('Configure subtitle providers to enable automatic subtitle downloads.'),
      ).toBeInTheDocument();
    });
  });

  it('opens settings modal when Settings button is clicked', async () => {
    const { subtitleProvidersApi } = await import('@/lib/api/client');
    vi.mocked(subtitleProvidersApi).listProviders.mockResolvedValue(mockProviders);

    render(<SubtitleProvidersPage />);

    await waitFor(() => {
      const settingsButtons = screen.getAllByRole('button', { name: 'Settings' });
      fireEvent.click(settingsButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /Configure OpenSubtitles/i })).toBeInTheDocument();
    });
  });
});
