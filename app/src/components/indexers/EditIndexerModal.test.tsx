import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EditIndexerModal } from './EditIndexerModal.js';
import type { EditIndexerDraft, EditIndexerSource } from './EditIndexerModal.js';

const mockTorznabIndexer: EditIndexerSource = {
  id: 1,
  name: 'My Torznab',
  implementation: 'Torznab',
  configContract: 'TorznabSettings',
  settings: JSON.stringify({ url: 'https://torznab.example.com', apiKey: 'secret123' }),
  protocol: 'torrent',
  appProfileId: 1,
  enabled: true,
  supportsRss: true,
  supportsSearch: true,
  priority: 25,
  supportedMediaTypes: '["TV", "MOVIE"]',
};

const mockCardigannIndexer: EditIndexerSource = {
  id: 2,
  name: 'My Jackett',
  implementation: 'Cardigann',
  configContract: 'CardigannSettings',
  settings: JSON.stringify({ definitionId: '1337x', sitelink: 'https://1337x.to', cookie: 'session=abc' }),
  protocol: 'torrent',
  appProfileId: null,
  enabled: false,
  supportsRss: true,
  supportsSearch: false,
  priority: 30,
  supportedMediaTypes: '["TV"]',
};

const mockUsenetIndexer: EditIndexerSource = {
  id: 3,
  name: 'My Usenet',
  implementation: 'Newznab',
  configContract: 'NewznabSettings',
  settings: JSON.stringify({ host: 'news.example.com', apiKey: 'usenet-key' }),
  protocol: 'usenet',
  appProfileId: 2,
  enabled: true,
  supportsRss: false,
  supportsSearch: true,
  priority: 20,
  supportedMediaTypes: '["MOVIE"]',
};

const mockAppProfiles = [
  { id: 1, name: 'Default' },
  { id: 2, name: 'High Priority' },
];

const noop = () => Promise.resolve();

describe('EditIndexerModal', () => {
  it('does not render when closed', () => {
    render(
      <EditIndexerModal
        isOpen={false}
        indexer={mockTorznabIndexer}
        onClose={noop}
        onSave={noop}
      />,
    );
    expect(screen.queryByLabelText(/edit indexer/i)).not.toBeInTheDocument();
  });

  it('renders name and priority fields', () => {
    render(
      <EditIndexerModal
        isOpen
        indexer={mockTorznabIndexer}
        onClose={noop}
        onSave={noop}
      />,
    );
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
  });

  it('renders checkboxes for enabled, rss, search', () => {
    render(
      <EditIndexerModal
        isOpen
        indexer={mockTorznabIndexer}
        onClose={noop}
        onSave={noop}
      />,
    );
    expect(screen.getByLabelText(/enabled/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/rss/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/search/i)).toBeInTheDocument();
  });

  it('shows validation error when name is empty on submit', async () => {
    render(
      <EditIndexerModal
        isOpen
        indexer={mockTorznabIndexer}
        onClose={noop}
        onSave={noop}
      />,
    );

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /save indexer/i }));
    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
  });

  it('calls onSave with correct draft when form is valid', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <EditIndexerModal
        isOpen
        indexer={mockTorznabIndexer}
        onClose={noop}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Updated Indexer' } });
    fireEvent.click(screen.getByRole('button', { name: /save indexer/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });

    const draft: EditIndexerDraft = onSave.mock.calls[0]![0];
    expect(draft.name).toBe('Updated Indexer');
    expect(draft.id).toBe(1);
    expect(draft.enabled).toBe(true);
    expect(draft.supportsRss).toBe(true);
    expect(draft.supportsSearch).toBe(true);
    expect(draft.priority).toBe(25);
    expect(draft.protocol).toBe('torrent');
    expect(draft.settings).toHaveProperty('url');
    expect(draft.settings).toHaveProperty('apiKey');
  });

  it('renders dynamic fields for torznab config contract', () => {
    render(
      <EditIndexerModal
        isOpen
        indexer={mockTorznabIndexer}
        onClose={noop}
        onSave={noop}
      />,
    );

    expect(screen.getByText('Indexer URL')).toBeInTheDocument();
    expect(screen.getByText('API Key')).toBeInTheDocument();
  });

  it('renders dynamic fields for cardigann config contract', () => {
    render(
      <EditIndexerModal
        isOpen
        indexer={mockCardigannIndexer}
        onClose={noop}
        onSave={noop}
      />,
    );

    expect(screen.getByText(/definition id/i)).toBeInTheDocument();
    expect(screen.getByText(/sitelink/i)).toBeInTheDocument();
    expect(screen.getByText(/cookie/i)).toBeInTheDocument();
  });

  it('renders app profile selector when appProfiles provided', () => {
    render(
      <EditIndexerModal
        isOpen
        indexer={mockTorznabIndexer}
        appProfiles={mockAppProfiles}
        onClose={noop}
        onSave={noop}
      />,
    );

    expect(screen.getByLabelText(/app profile/i)).toBeInTheDocument();
  });

  it('disables action buttons while isSubmitting', () => {
    render(
      <EditIndexerModal
        isOpen
        indexer={mockTorznabIndexer}
        isSubmitting
        onClose={noop}
        onSave={noop}
      />,
    );

    expect(screen.getByRole('button', { name: /save indexer/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
  });

  it('switches dynamic fields when protocol changes for fallback contracts', async () => {
    const fallbackIndexer: EditIndexerSource = {
      ...mockTorznabIndexer,
      configContract: 'UnknownSettings',
    };

    render(
      <EditIndexerModal
        isOpen
        indexer={fallbackIndexer}
        onClose={noop}
        onSave={noop}
      />,
    );

    expect(screen.getByText('Indexer URL')).toBeInTheDocument();

    const protocolTrigger = screen.getByRole('combobox', { name: /protocol/i });
    fireEvent.click(protocolTrigger);
    fireEvent.click(screen.getByRole('option', { name: 'usenet' }));

    await waitFor(() => {
      expect(screen.getByText('Host')).toBeInTheDocument();
    });
  });

  it('populates initial values from indexer prop', () => {
    render(
      <EditIndexerModal
        isOpen
        indexer={mockTorznabIndexer}
        onClose={noop}
        onSave={noop}
      />,
    );

    const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
    expect(nameInput.value).toBe('My Torznab');
  });

  it('clears validation error after user enters a valid name and resubmits', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <EditIndexerModal
        isOpen
        indexer={mockTorznabIndexer}
        onClose={noop}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /save indexer/i }));
    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'T' } });
    fireEvent.click(screen.getByRole('button', { name: /save indexer/i }));
    await waitFor(() => {
      expect(screen.queryByText(/name is required/i)).not.toBeInTheDocument();
      expect(onSave).toHaveBeenCalledTimes(1);
    });
  });

  it('submits correct data for usenet indexer', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <EditIndexerModal
        isOpen
        indexer={mockUsenetIndexer}
        onClose={noop}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Updated Usenet' } });
    fireEvent.click(screen.getByRole('button', { name: /save indexer/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });

    const draft: EditIndexerDraft = onSave.mock.calls[0]![0];
    expect(draft.protocol).toBe('usenet');
    expect(draft.settings).toHaveProperty('host');
    expect(draft.settings).toHaveProperty('apiKey');
  });
});
