import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AddIndexerModal } from './AddIndexerModal.js';
import type { AddIndexerDraft, IndexerPreset } from './AddIndexerModal.js';

const mockPresets: IndexerPreset[] = [
  {
    id: 'torznab',
    name: 'Torznab',
    description: 'For Newznab-compatible APIs',
    protocol: 'torrent',
    implementation: 'Torznab',
    configContract: 'TorznabSettings',
    privacy: 'Public',
    fields: [
      { name: 'url', label: 'Indexer URL', type: 'text', required: true, defaultValue: '' },
      { name: 'apiKey', label: 'API Key', type: 'password', required: true, defaultValue: '' },
      { name: 'category', label: 'Category', type: 'number', defaultValue: 0 },
    ],
  },
  {
    id: 'jackett',
    name: 'Jackett',
    description: 'For Jackett / Cardigann indexers',
    protocol: 'torrent',
    implementation: 'Cardigann',
    configContract: 'CardigannSettings',
    privacy: 'Public',
    fields: [
      { name: 'definitionId', label: 'Definition ID', type: 'text', required: true, defaultValue: '' },
      { name: 'apiKey', label: 'API Key', type: 'password', required: true, defaultValue: '' },
      { name: 'targetPrivate', label: 'Private', type: 'boolean', defaultValue: false },
    ],
  },
];

const mockAppProfiles = [
  { id: 1, name: 'Default' },
  { id: 2, name: 'High Priority' },
];

const noop = () => Promise.resolve();

describe('AddIndexerModal', () => {
  it('does not render when closed', () => {
    render(
      <AddIndexerModal
        isOpen={false}
        presets={mockPresets}
        onClose={noop}
        onCreate={noop}
        onTestConnection={noop}
      />,
    );
    expect(screen.queryByLabelText(/add indexer/i)).not.toBeInTheDocument();
  });

  it('renders preset selector buttons', () => {
    render(
      <AddIndexerModal
        isOpen
        presets={mockPresets}
        onClose={noop}
        onCreate={noop}
        onTestConnection={noop}
      />,
    );
    expect(screen.getByText('Torznab')).toBeInTheDocument();
    expect(screen.getByText('For Newznab-compatible APIs')).toBeInTheDocument();
    expect(screen.getByText('Jackett')).toBeInTheDocument();
    expect(screen.getByText('For Jackett / Cardigann indexers')).toBeInTheDocument();
  });

  it('renders name and priority fields', () => {
    render(
      <AddIndexerModal
        isOpen
        presets={mockPresets}
        onClose={noop}
        onCreate={noop}
        onTestConnection={noop}
      />,
    );
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
  });

  it('renders checkboxes for enabled, rss, search', () => {
    render(
      <AddIndexerModal
        isOpen
        presets={mockPresets}
        onClose={noop}
        onCreate={noop}
        onTestConnection={noop}
      />,
    );
    expect(screen.getByLabelText(/enabled/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/rss/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/search/i)).toBeInTheDocument();
  });

  it('shows validation error when name is empty on submit', async () => {
    render(
      <AddIndexerModal
        isOpen
        presets={mockPresets}
        onClose={noop}
        onCreate={noop}
        onTestConnection={noop}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /add indexer/i }));
    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
  });

  it('calls onCreate with correct draft when form is valid', async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(
      <AddIndexerModal
        isOpen
        presets={mockPresets}
        onClose={noop}
        onCreate={onCreate}
        onTestConnection={noop}
      />,
    );

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'My Indexer' } });
    fireEvent.change(screen.getByLabelText('Indexer URL'), {
      target: { value: 'https://indexer.example.test' },
    });
    fireEvent.change(screen.getByLabelText('API Key'), { target: { value: 'secret-key' } });
    fireEvent.click(screen.getByRole('button', { name: /add indexer/i }));

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledTimes(1);
    });

    const draft: AddIndexerDraft = onCreate.mock.calls[0]![0];
    expect(draft.name).toBe('My Indexer');
    expect(draft.presetId).toBe('torznab');
    expect(draft.enabled).toBe(true);
    expect(draft.supportsRss).toBe(true);
    expect(draft.supportsSearch).toBe(true);
    expect(draft.priority).toBe(25);
    expect(draft.protocol).toBe('torrent');
    expect(draft.settings).toMatchObject({
      url: 'https://indexer.example.test',
      apiKey: 'secret-key',
    });
  });

  it('rejects blank required fields from the selected preset', async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(
      <AddIndexerModal
        isOpen
        presets={mockPresets}
        onClose={noop}
        onCreate={onCreate}
        onTestConnection={noop}
      />,
    );

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'My Indexer' } });
    fireEvent.change(screen.getByLabelText('Indexer URL'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /add indexer/i }));

    await waitFor(() => {
      expect(screen.getByText('Indexer URL is required')).toBeInTheDocument();
      expect(screen.getByText('API Key is required')).toBeInTheDocument();
    });
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('updates preset selection when a preset button is clicked', () => {
    render(
      <AddIndexerModal
        isOpen
        presets={mockPresets}
        onClose={noop}
        onCreate={noop}
        onTestConnection={noop}
      />,
    );

    fireEvent.click(screen.getByText('Jackett'));
    expect(screen.getByText('Jackett').closest('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows dynamic fields for selected preset', () => {
    render(
      <AddIndexerModal
        isOpen
        presets={mockPresets}
        onClose={noop}
        onCreate={noop}
        onTestConnection={noop}
      />,
    );

    expect(screen.getByText('Indexer URL')).toBeInTheDocument();
    expect(screen.getByText('API Key')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
  });

  it('swaps dynamic fields when preset changes', () => {
    const { rerender } = render(
      <AddIndexerModal
        isOpen
        presets={mockPresets}
        onClose={noop}
        onCreate={noop}
        onTestConnection={noop}
      />,
    );

    expect(screen.getByText('Indexer URL')).toBeInTheDocument();
    expect(screen.queryByText('Definition ID')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Jackett'));

    rerender(
      <AddIndexerModal
        isOpen
        presets={mockPresets}
        onClose={noop}
        onCreate={noop}
        onTestConnection={noop}
      />,
    );

    expect(screen.getByText('Definition ID')).toBeInTheDocument();
    expect(screen.queryByText('Indexer URL')).not.toBeInTheDocument();
  });

  it('renders app profile selector when appProfiles provided', () => {
    render(
      <AddIndexerModal
        isOpen
        presets={mockPresets}
        appProfiles={mockAppProfiles}
        onClose={noop}
        onCreate={noop}
        onTestConnection={noop}
      />,
    );

    expect(screen.getByLabelText(/app profile/i)).toBeInTheDocument();
  });

  it('disables action buttons while isSubmitting', () => {
    render(
      <AddIndexerModal
        isOpen
        presets={mockPresets}
        isSubmitting
        onClose={noop}
        onCreate={noop}
        onTestConnection={noop}
      />,
    );

    expect(screen.getByRole('button', { name: /add indexer/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /test connection/i })).toBeDisabled();
  });

  it('resets form and clears test result when modal reopens', async () => {
    const onTestConnection = vi.fn().mockResolvedValue({ success: true, message: 'Connected' });
    const { rerender } = render(
      <AddIndexerModal
        isOpen
        presets={mockPresets}
        onClose={noop}
        onCreate={noop}
        onTestConnection={onTestConnection}
      />,
    );

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Test' } });

    rerender(
      <AddIndexerModal
        isOpen={false}
        presets={mockPresets}
        onClose={noop}
        onCreate={noop}
        onTestConnection={onTestConnection}
      />,
    );

    rerender(
      <AddIndexerModal
        isOpen
        presets={mockPresets}
        onClose={noop}
        onCreate={noop}
        onTestConnection={onTestConnection}
      />,
    );

    const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
    expect(nameInput.value).toBe('');
  });

  it('calls onTestConnection when Test Connection is clicked with valid form', async () => {
    const onTestConnection = vi.fn().mockResolvedValue({ success: true, message: 'OK' });
    render(
      <AddIndexerModal
        isOpen
        presets={mockPresets}
        onClose={noop}
        onCreate={noop}
        onTestConnection={onTestConnection}
      />,
    );

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'TestIndexer' } });
    fireEvent.change(screen.getByLabelText('Indexer URL'), {
      target: { value: 'https://indexer.example.test' },
    });
    fireEvent.change(screen.getByLabelText('API Key'), { target: { value: 'secret-key' } });
    fireEvent.click(screen.getByRole('button', { name: /test connection/i }));

    await waitFor(() => {
      expect(onTestConnection).toHaveBeenCalledTimes(1);
    });
  });

  it('does not call onTestConnection when form is invalid', async () => {
    const onTestConnection = vi.fn().mockResolvedValue({ success: true, message: 'OK' });
    render(
      <AddIndexerModal
        isOpen
        presets={mockPresets}
        onClose={noop}
        onCreate={noop}
        onTestConnection={onTestConnection}
      />,
    );

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'TestIndexer' } });
    fireEvent.click(screen.getByRole('button', { name: /test connection/i }));
    await waitFor(() => {
      expect(onTestConnection).not.toHaveBeenCalled();
    });
  });
});
