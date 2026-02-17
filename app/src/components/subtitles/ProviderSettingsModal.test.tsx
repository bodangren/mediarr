import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProviderSettingsModal } from './ProviderSettingsModal';
import type { SubtitleProvider } from '@/lib/api';

describe('ProviderSettingsModal', () => {
  const mockOnSave = vi.fn();
  const mockOnTest = vi.fn();
  const mockOnReset = vi.fn();

  const mockOpenSubtitlesProvider: SubtitleProvider = {
    id: 'opensubtitles-1',
    name: 'OpenSubtitles',
    enabled: true,
    type: 'opensubtitles',
    settings: {
      username: 'testuser',
      password: 'testpass',
      apiKey: 'testkey',
    },
    status: 'active',
  };

  const mockSubsceneProvider: SubtitleProvider = {
    id: 'subscene-1',
    name: 'Subscene',
    enabled: true,
    type: 'subscene',
    settings: {},
    status: 'active',
  };

  const mockAddic7edProvider: SubtitleProvider = {
    id: 'addic7ed-1',
    name: 'Addic7ed',
    enabled: true,
    type: 'addic7ed',
    settings: {
      username: 'testuser',
      password: 'testpass',
    },
    status: 'active',
  };

  const mockGenericProvider: SubtitleProvider = {
    id: 'generic-1',
    name: 'Generic Provider',
    enabled: true,
    type: 'generic',
    settings: {
      apiKey: 'testkey',
      timeout: 30,
      maxResults: 50,
      useSSL: true,
    },
    status: 'active',
  };

  it('does not render when provider is null', () => {
    const mockOnClose = vi.fn();
    const { container } = render(
      <ProviderSettingsModal
        isOpen
        provider={null}
        onSave={mockOnSave}
        onTest={mockOnTest}
        onReset={mockOnReset}
        onClose={mockOnClose}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders OpenSubtitles provider fields', () => {
    const mockOnClose = vi.fn();
    render(
      <ProviderSettingsModal
        isOpen
        provider={mockOpenSubtitlesProvider}
        onSave={mockOnSave}
        onTest={mockOnTest}
        onReset={mockOnReset}
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('API Key (Optional)')).toBeInTheDocument();
  });

  it('renders Subscene provider with info message', () => {
    const mockOnClose = vi.fn();
    render(
      <ProviderSettingsModal
        isOpen
        provider={mockSubsceneProvider}
        onSave={mockOnSave}
        onTest={mockOnTest}
        onReset={mockOnReset}
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByText('This provider does not require any configuration')).toBeInTheDocument();
  });

  it('renders Addic7ed provider fields', () => {
    const mockOnClose = vi.fn();
    render(
      <ProviderSettingsModal
        isOpen
        provider={mockAddic7edProvider}
        onSave={mockOnSave}
        onTest={mockOnTest}
        onReset={mockOnReset}
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('renders Generic provider fields', () => {
    const mockOnClose = vi.fn();
    render(
      <ProviderSettingsModal
        isOpen
        provider={mockGenericProvider}
        onSave={mockOnSave}
        onTest={mockOnTest}
        onReset={mockOnReset}
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByLabelText('API Key')).toBeInTheDocument();
    expect(screen.getByLabelText('Timeout (seconds)')).toBeInTheDocument();
    expect(screen.getByLabelText('Max Results')).toBeInTheDocument();
    expect(screen.getByLabelText('Enable SSL')).toBeInTheDocument();
  });

  it('calls onSave when Save button is clicked', async () => {
    const mockOnClose = vi.fn();
    mockOnSave.mockResolvedValueOnce(undefined);
    render(
      <ProviderSettingsModal
        isOpen
        provider={mockSubsceneProvider}
        onSave={mockOnSave}
        onTest={mockOnTest}
        onReset={mockOnReset}
        onClose={mockOnClose}
      />,
    );

    const saveButton = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onClose when Cancel button is clicked', () => {
    const mockOnClose = vi.fn();
    render(
      <ProviderSettingsModal
        isOpen
        provider={mockSubsceneProvider}
        onSave={mockOnSave}
        onTest={mockOnTest}
        onReset={mockOnReset}
        onClose={mockOnClose}
      />,
    );

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onTest when Test button is clicked', async () => {
    const mockOnClose = vi.fn();
    mockOnTest.mockResolvedValueOnce({ success: true, message: 'Test passed' });
    render(
      <ProviderSettingsModal
        isOpen
        provider={mockSubsceneProvider}
        onSave={mockOnSave}
        onTest={mockOnTest}
        onReset={mockOnReset}
        onClose={mockOnClose}
      />,
    );

    const testButton = screen.getByRole('button', { name: 'Test' });
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(mockOnTest).toHaveBeenCalledWith(mockSubsceneProvider.id);
    });
  });

  it('shows reset confirmation on first click of Reset button', () => {
    const mockOnClose = vi.fn();
    render(
      <ProviderSettingsModal
        isOpen
        provider={mockGenericProvider}
        onSave={mockOnSave}
        onTest={mockOnTest}
        onReset={mockOnReset}
        onClose={mockOnClose}
      />,
    );

    const resetButton = screen.getByRole('button', { name: 'Reset' });
    fireEvent.click(resetButton);

    expect(screen.getByText('Confirm Reset')).toBeInTheDocument();
    expect(mockOnReset).not.toHaveBeenCalled();
  });

  it('calls onReset on second click of Reset button', async () => {
    mockOnReset.mockResolvedValueOnce(mockGenericProvider);
    render(
      <ProviderSettingsModal
        isOpen
        provider={mockGenericProvider}
        onSave={mockOnSave}
        onTest={mockOnTest}
        onReset={mockOnReset}
      />,
    );

    const resetButton = screen.getByRole('button', { name: 'Reset' });
    fireEvent.click(resetButton);
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(mockOnReset).toHaveBeenCalledWith(mockGenericProvider.id);
    });
  });

  it('disables all action buttons while saving', () => {
    const mockOnClose = vi.fn();
    render(
      <ProviderSettingsModal
        isOpen
        provider={mockSubsceneProvider}
        isSaving
        onSave={mockOnSave}
        onTest={mockOnTest}
        onReset={mockOnReset}
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Test' })).toBeDisabled();
  });

  it('displays test result when available', async () => {
    const mockOnClose = vi.fn();
    mockOnTest.mockResolvedValueOnce({ success: true, message: 'Connection successful' });
    render(
      <ProviderSettingsModal
        isOpen
        provider={mockSubsceneProvider}
        onSave={mockOnSave}
        onTest={mockOnTest}
        onReset={mockOnReset}
        onClose={mockOnClose}
      />,
    );

    const testButton = screen.getByRole('button', { name: 'Test' });
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(screen.getByText('Connection successful')).toBeInTheDocument();
    });
  });

  it('shows error test result', async () => {
    const mockOnClose = vi.fn();
    mockOnTest.mockResolvedValueOnce({ success: false, message: 'Authentication failed' });
    render(
      <ProviderSettingsModal
        isOpen
        provider={mockOpenSubtitlesProvider}
        onSave={mockOnSave}
        onTest={mockOnTest}
        onReset={mockOnReset}
        onClose={mockOnClose}
      />,
    );

    const testButton = screen.getByRole('button', { name: 'Test' });
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(screen.getByText('Authentication failed')).toBeInTheDocument();
    });
  });
});
