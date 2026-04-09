import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AddIndexerModal } from '@/components/indexers/AddIndexerModal';
import { AddProfileModal } from '@/components/settings/AddProfileModal';
import type { IndexerPreset } from '@/components/indexers/AddIndexerModal';
import type { QualityProfileItem } from '@/lib/api/qualityProfileApi';

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
    ],
  },
];

const mockProfile: QualityProfileItem = {
  id: 1,
  name: 'HD-1080p',
  cutoff: 2,
  items: [
    { quality: { id: 1, name: 'SDTV', resolution: 480, source: 'TV' }, allowed: false },
    { quality: { id: 2, name: 'WEB-DL 1080p', resolution: 1080, source: 'Web' }, allowed: true },
    { quality: { id: 3, name: 'Bluray-1080p', resolution: 1080, source: 'Bluray' }, allowed: true },
  ],
};

const noop = () => Promise.resolve();

describe('Form Standardization Smoke', () => {
  it('AddIndexerModal shows invalid state then submits valid payload', async () => {
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

    fireEvent.click(screen.getByRole('button', { name: /add indexer/i }));
    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Smoke Indexer' } });
    fireEvent.click(screen.getByRole('button', { name: /add indexer/i }));

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledTimes(1);
    });
  });

  it('AddProfileModal shows invalid state then submits valid payload', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(<AddProfileModal isOpen onClose={noop} onSave={onSave} editProfile={mockProfile} />);

    const nameInput = screen.getByLabelText(/profile name/i);
    fireEvent.change(nameInput, { target: { value: '' } });

    await waitFor(() => {
      expect(screen.getByText(/profile name is required/i)).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    expect(saveButton).toBeDisabled();

    fireEvent.change(nameInput, { target: { value: 'Smoke Profile' } });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });
  });
});
