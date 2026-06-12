import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImportListModal } from './ImportListModal.js';
import type { CreateImportListInput, ImportList } from '@/lib/api/importListsApi';
import type { QualityProfile } from '@/types/qualityProfile';

// Integration-style tests with Radix Dialog and user-event need more time in jsdom.
vi.setConfig({ testTimeout: 15_000 });

const mockQualityProfiles: QualityProfile[] = [
  { id: 1, name: 'HD-1080p', cutoffId: 1, qualities: [] },
  { id: 2, name: 'UHD-2160p', cutoffId: 2, qualities: [] },
];

const mockListPopular: ImportList = {
  id: 7,
  name: 'Popular Movies',
  providerType: 'tmdb-popular',
  config: { mediaType: 'series', limit: 50 },
  rootFolderPath: '/media/movies',
  qualityProfileId: 1,
  languageProfileId: null,
  monitorType: 'collection',
  enabled: false,
  syncInterval: 12,
  lastSyncAt: null,
  createdAt: '2026-06-10T00:00:00.000Z',
  updatedAt: '2026-06-10T00:00:00.000Z',
  qualityProfile: { id: 1, name: 'HD-1080p' },
};

const mockListTmdbList: ImportList = {
  ...mockListPopular,
  id: 8,
  name: 'Curated Sci-Fi',
  providerType: 'tmdb-list',
  config: { listId: '8228' },
  qualityProfileId: 2,
  qualityProfile: { id: 2, name: 'UHD-2160p' },
};

type RenderOverrides = Partial<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: CreateImportListInput) => Promise<void> | void;
  editList: ImportList | null;
  isLoading: boolean;
  qualityProfiles: QualityProfile[];
}>;

const renderImportListModal = (overrides: RenderOverrides = {}) => {
  const onClose = overrides.onClose ?? vi.fn();
  const onSave = overrides.onSave ?? vi.fn();
  const utils = render(
    <ImportListModal
      isOpen={overrides.isOpen ?? true}
      onClose={onClose}
      onSave={onSave}
      editList={overrides.editList ?? null}
      isLoading={overrides.isLoading ?? false}
      qualityProfiles={overrides.qualityProfiles ?? mockQualityProfiles}
    />,
  );
  return { ...utils, onClose, onSave };
};

describe('ImportListModal', () => {
  it('does not render dialog content when isOpen is false', () => {
    renderImportListModal({ isOpen: false, editList: mockListPopular });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /edit import list/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^name/i)).not.toBeInTheDocument();
  });

  it('renders empty form when editList is null', () => {
    renderImportListModal({ editList: null });

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole('heading', { name: 'Add Import List' })).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/^name/i) as HTMLInputElement;
    expect(nameInput.value).toBe('');

    const rootFolderInput = screen.getByLabelText(/root folder/i) as HTMLInputElement;
    expect(rootFolderInput.value).toBe('');

    const submitButton = screen.getByRole('button', { name: 'Add Import List' });
    expect(submitButton).toBeInTheDocument();
  });

  it('pre-fills form when editList is provided', async () => {
    renderImportListModal({ editList: mockListPopular });

    const heading = await screen.findByRole('heading', { name: 'Edit Import List' });
    expect(heading).toBeInTheDocument();

    const submitButton = await screen.findByRole('button', { name: 'Save Changes' });
    expect(submitButton).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/^name/i) as HTMLInputElement;
    expect(nameInput.value).toBe('Popular Movies');

    const rootFolderInput = screen.getByLabelText(/root folder/i) as HTMLInputElement;
    expect(rootFolderInput.value).toBe('/media/movies');

    const providerSelect = screen.getByLabelText(/provider type/i) as HTMLSelectElement;
    expect(providerSelect.value).toBe('tmdb-popular');

    const qualitySelect = screen.getByLabelText(/quality profile/i) as HTMLSelectElement;
    expect(qualitySelect.value).toBe('1');

    const monitorSelect = screen.getByLabelText(/monitor type/i) as HTMLSelectElement;
    expect(monitorSelect.value).toBe('collection');

    const syncIntervalInput = screen.getByLabelText(/sync interval/i) as HTMLInputElement;
    expect(syncIntervalInput.value).toBe('12');

    const enabledCheckbox = screen.getByLabelText(/enable this import list/i) as HTMLInputElement;
    expect(enabledCheckbox.checked).toBe(false);

    const mediaTypeSelect = screen.getByLabelText(/media type/i) as HTMLSelectElement;
    expect(mediaTypeSelect.value).toBe('series');

    const limitInput = screen.getByLabelText(/^limit/i) as HTMLInputElement;
    expect(limitInput.value).toBe('50');

    expect(screen.queryByLabelText(/list id/i)).not.toBeInTheDocument();
  });

  it('shows TMDB Popular fields when providerType is tmdb-popular', () => {
    renderImportListModal({ editList: null });

    expect(screen.getByLabelText(/media type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^limit/i)).toBeInTheDocument();

    expect(screen.queryByLabelText(/list id/i)).not.toBeInTheDocument();
    expect(screen.queryByText('TMDB List Settings')).not.toBeInTheDocument();
  });

  it('shows TMDB List fields when providerType is tmdb-list and hides TMDB Popular fields', async () => {
    const user = userEvent.setup({ delay: null });
    renderImportListModal({ editList: null });

    const providerSelect = screen.getByLabelText(/provider type/i) as HTMLSelectElement;
    await user.selectOptions(providerSelect, 'tmdb-list');

    const listIdInput = await screen.findByLabelText(/list id/i) as HTMLInputElement;
    expect(listIdInput).toBeInTheDocument();

    expect(screen.getByText('TMDB List Settings')).toBeInTheDocument();

    expect(screen.queryByLabelText(/media type/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^limit/i)).not.toBeInTheDocument();
    expect(screen.queryByText('TMDB Popular Settings')).not.toBeInTheDocument();
  });

  it('pre-fills TMDB List ID when editList is a tmdb-list', async () => {
    renderImportListModal({ editList: mockListTmdbList });

    const listIdInput = await screen.findByLabelText(/list id/i) as HTMLInputElement;
    expect(listIdInput.value).toBe('8228');

    const providerSelect = screen.getByLabelText(/provider type/i) as HTMLSelectElement;
    expect(providerSelect.value).toBe('tmdb-list');

    expect(screen.queryByLabelText(/media type/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^limit/i)).not.toBeInTheDocument();
  });

  it('shows validation alert and disables Save when required fields are empty', () => {
    renderImportListModal({ editList: null });

    const submitButton = screen.getByRole('button', { name: 'Add Import List' });
    expect(submitButton).toBeDisabled();

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent(/fill in all required fields/i);
  });

  it('calls onSave with form data when form is valid', async () => {
    const user = userEvent.setup({ delay: null });
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderImportListModal({ onSave, editList: null });

    const nameInput = screen.getByLabelText(/^name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'My New List');

    const rootFolderInput = screen.getByLabelText(/root folder/i);
    await user.clear(rootFolderInput);
    await user.type(rootFolderInput, '/data/movies');

    const submitButton = screen.getByRole('button', { name: 'Add Import List' });
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });

    await user.click(submitButton);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });

    const submitted = onSave.mock.calls[0]![0] as CreateImportListInput;
    expect(submitted.name).toBe('My New List');
    expect(submitted.providerType).toBe('tmdb-popular');
    expect(submitted.rootFolderPath).toBe('/data/movies');
    expect(submitted.qualityProfileId).toBe(1);
    expect(submitted.config).toEqual({ mediaType: 'movie', limit: 20 });
    expect(submitted.enabled).toBe(true);
    expect(submitted.syncInterval).toBe(24);
    expect(submitted.monitorType).toBe('movie');
  });

  it('calls onSave with tmdb-list config when provider is switched before submit', async () => {
    const user = userEvent.setup({ delay: null });
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderImportListModal({ onSave, editList: null });

    const nameInput = screen.getByLabelText(/^name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Sci-Fi Watchlist');

    const rootFolderInput = screen.getByLabelText(/root folder/i);
    await user.clear(rootFolderInput);
    await user.type(rootFolderInput, '/data/scifi');

    const providerSelect = screen.getByLabelText(/provider type/i) as HTMLSelectElement;
    await user.selectOptions(providerSelect, 'tmdb-list');

    const listIdInput = await screen.findByLabelText(/list id/i) as HTMLInputElement;
    await user.type(listIdInput, '706');

    const submitButton = screen.getByRole('button', { name: 'Add Import List' });
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });

    await user.click(submitButton);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });

    const submitted = onSave.mock.calls[0]![0] as CreateImportListInput;
    expect(submitted.providerType).toBe('tmdb-list');
    expect(submitted.config).toEqual({ listId: '706' });
    expect(submitted.name).toBe('Sci-Fi Watchlist');
  });

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn();
    renderImportListModal({ onClose, editList: null });

    const cancelButton = screen.getByRole('button', { name: /^cancel$/i });
    await userEvent.click(cancelButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
