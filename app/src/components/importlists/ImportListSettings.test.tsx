import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImportListSettings } from './ImportListSettings.js';
import type {
  CreateExclusionInput,
  CreateImportListInput,
  ImportList,
  ImportListExclusion,
  UpdateImportListInput,
} from '@/lib/api/importListsApi';
import type { QualityProfile } from '@/types/qualityProfile';

const mockSearchMovies = vi.fn();

vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(() => ({
    discoverApi: {
      searchMovies: mockSearchMovies,
    },
  })),
}));

const mockQualityProfiles: QualityProfile[] = [
  { id: 1, name: 'HD-1080p', cutoffId: 1, qualities: [] },
  { id: 2, name: 'UHD-2160p', cutoffId: 2, qualities: [] },
];

const mockListPopular: ImportList = {
  id: 1,
  name: 'Popular Movies',
  providerType: 'tmdb-popular',
  config: { mediaType: 'movie', limit: 20 },
  rootFolderPath: '/media/movies',
  qualityProfileId: 1,
  languageProfileId: null,
  monitorType: 'all',
  enabled: true,
  syncInterval: 24,
  lastSyncAt: null,
  createdAt: '2026-06-10T00:00:00.000Z',
  updatedAt: '2026-06-10T00:00:00.000Z',
  qualityProfile: { id: 1, name: 'HD-1080p' },
};

const mockListTmdbList: ImportList = {
  ...mockListPopular,
  id: 2,
  name: 'Curated Sci-Fi',
  providerType: 'tmdb-list',
  config: { listId: '8228' },
  rootFolderPath: '/media/scifi',
  qualityProfileId: 2,
  qualityProfile: { id: 2, name: 'UHD-2160p' },
};

const mockExclusionA: ImportListExclusion = {
  id: 10,
  importListId: 1,
  tmdbId: 100,
  imdbId: null,
  tvdbId: null,
  title: 'Movie A',
  createdAt: '2026-06-10T00:00:00.000Z',
};

const mockExclusionB: ImportListExclusion = {
  id: 20,
  importListId: null,
  tmdbId: 200,
  imdbId: 'tt200',
  tvdbId: null,
  title: 'Movie B',
  createdAt: '2026-06-10T00:00:00.000Z',
};

type RenderOverrides = Partial<{
  lists: ImportList[];
  exclusions: ImportListExclusion[];
  qualityProfiles: QualityProfile[];
  isLoadingLists: boolean;
  isLoadingExclusions: boolean;
  listsError: Error | null;
  exclusionsError: Error | null;
  onCreateList: (input: CreateImportListInput) => Promise<void>;
  onUpdateList: (id: number, input: UpdateImportListInput) => Promise<void>;
  onDeleteList: (id: number) => Promise<void>;
  onSyncList: (id: number) => Promise<void>;
  onCreateExclusion: (input: CreateExclusionInput) => Promise<void>;
  onDeleteExclusion: (id: number) => Promise<void>;
  onRefreshLists: () => void;
  onRefreshExclusions: () => void;
  title: string;
  description: string;
  defaultTab: 'lists' | 'exclusions';
}>;

const renderImportListSettings = (overrides: RenderOverrides = {}) => {
  const onCreateList = overrides.onCreateList ?? vi.fn().mockResolvedValue(undefined);
  const onUpdateList = overrides.onUpdateList ?? vi.fn().mockResolvedValue(undefined);
  const onDeleteList = overrides.onDeleteList ?? vi.fn().mockResolvedValue(undefined);
  const onSyncList = overrides.onSyncList ?? vi.fn().mockResolvedValue(undefined);
  const onCreateExclusion =
    overrides.onCreateExclusion ?? vi.fn().mockResolvedValue(undefined);
  const onDeleteExclusion = overrides.onDeleteExclusion ?? vi.fn().mockResolvedValue(undefined);
  const onRefreshLists = overrides.onRefreshLists ?? vi.fn();
  const onRefreshExclusions = overrides.onRefreshExclusions ?? vi.fn();

  const utils = render(
    <ImportListSettings
      lists={overrides.lists ?? [mockListPopular, mockListTmdbList]}
      exclusions={overrides.exclusions ?? [mockExclusionA, mockExclusionB]}
      qualityProfiles={overrides.qualityProfiles ?? mockQualityProfiles}
      isLoadingLists={overrides.isLoadingLists ?? false}
      isLoadingExclusions={overrides.isLoadingExclusions ?? false}
      listsError={overrides.listsError ?? null}
      exclusionsError={overrides.exclusionsError ?? null}
      onCreateList={onCreateList}
      onUpdateList={onUpdateList}
      onDeleteList={onDeleteList}
      onSyncList={onSyncList}
      onCreateExclusion={onCreateExclusion}
      onDeleteExclusion={onDeleteExclusion}
      onRefreshLists={onRefreshLists}
      onRefreshExclusions={onRefreshExclusions}
      title={overrides.title}
      description={overrides.description}
      defaultTab={overrides.defaultTab}
    />,
  );

  return {
    ...utils,
    onCreateList,
    onUpdateList,
    onDeleteList,
    onSyncList,
    onCreateExclusion,
    onDeleteExclusion,
    onRefreshLists,
    onRefreshExclusions,
  };
};

const findListCard = (listName: string): HTMLElement => {
  const heading = screen.getByRole('heading', { name: listName });
  const card = heading.closest('div.rounded-sm');
  if (!card) {
    throw new Error(`Could not locate card container for list "${listName}"`);
  }
  return card as HTMLElement;
};

describe('ImportListSettings (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchMovies.mockResolvedValue({ results: [] });
  });

  it('renders ImportListList on Lists tab by default', () => {
    renderImportListSettings();

    expect(screen.getByRole('heading', { name: 'Import Lists' })).toBeInTheDocument();

    expect(
      screen.getByRole('heading', { name: 'Popular Movies' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Curated Sci-Fi' }),
    ).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Add Import List' })).toBeInTheDocument();

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByText('No exclusions configured')).not.toBeInTheDocument();
  });

  it('switches to Exclusions tab when clicked', async () => {
    const user = userEvent.setup();
    renderImportListSettings();

    const exclusionsTab = screen.getByRole('button', { name: 'Exclusions' });
    await user.click(exclusionsTab);

    expect(screen.queryByText('Popular Movies')).not.toBeInTheDocument();
    expect(screen.queryByText('Curated Sci-Fi')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Import List' })).not.toBeInTheDocument();

    const table = await screen.findByRole('table');
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(3);

    expect(within(table).getByText('Movie A')).toBeInTheDocument();
    expect(within(table).getByText('Movie B')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add exclusion/i })).toBeInTheDocument();
  });

  it('opens ImportListModal when Add Import List clicked', async () => {
    const user = userEvent.setup();
    renderImportListSettings();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add Import List' }));

    const dialog = await screen.findByRole('dialog', { name: /add import list/i });
    expect(dialog).toBeInTheDocument();
    expect(
      within(dialog).getByRole('heading', { name: 'Add Import List' }),
    ).toBeInTheDocument();

    const nameInput = within(dialog).getByLabelText(/^name/i) as HTMLInputElement;
    expect(nameInput.value).toBe('');
  });

  it('opens ImportListModal with editList when Edit clicked', async () => {
    const user = userEvent.setup();
    renderImportListSettings();

    const cardA = findListCard('Popular Movies');
    await user.click(within(cardA).getByRole('button', { name: /edit/i }));

    const dialog = await screen.findByRole('dialog', { name: /edit import list/i });
    expect(dialog).toBeInTheDocument();
    expect(
      within(dialog).getByRole('heading', { name: 'Edit Import List' }),
    ).toBeInTheDocument();

    const nameInput = within(dialog).getByLabelText(/^name/i) as HTMLInputElement;
    expect(nameInput.value).toBe('Popular Movies');

    const rootFolderInput = within(dialog).getByLabelText(/root folder/i) as HTMLInputElement;
    expect(rootFolderInput.value).toBe('/media/movies');

    expect(within(dialog).getByRole('button', { name: 'Save Changes' })).toBeInTheDocument();
  });

  it('calls onCreateList and refreshes when modal saves (create mode)', async () => {
    const user = userEvent.setup();
    const onCreateList = vi.fn().mockResolvedValue(undefined);
    const onRefreshLists = vi.fn();
    renderImportListSettings({ onCreateList, onRefreshLists });

    await user.click(screen.getByRole('button', { name: 'Add Import List' }));

    const dialog = await screen.findByRole('dialog', { name: /add import list/i });

    fireEvent.change(within(dialog).getByLabelText(/^name/i), {
      target: { value: 'My New List' },
    });
    fireEvent.change(within(dialog).getByLabelText(/root folder/i), {
      target: { value: '/data/movies' },
    });

    const submitButton = within(dialog).getByRole('button', { name: 'Add Import List' });
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });

    await user.click(submitButton);

    await waitFor(() => {
      expect(onCreateList).toHaveBeenCalledTimes(1);
    });
    expect(onRefreshLists).toHaveBeenCalledTimes(1);

    const submitted = onCreateList.mock.calls[0]![0] as CreateImportListInput;
    expect(submitted.name).toBe('My New List');
    expect(submitted.rootFolderPath).toBe('/data/movies');
    expect(submitted.providerType).toBe('tmdb-popular');
  });

  it('calls onUpdateList and refreshes when modal saves (edit mode)', async () => {
    const user = userEvent.setup();
    const onUpdateList = vi.fn().mockResolvedValue(undefined);
    const onRefreshLists = vi.fn();
    renderImportListSettings({ onUpdateList, onRefreshLists });

    const cardA = findListCard('Popular Movies');
    await user.click(within(cardA).getByRole('button', { name: /edit/i }));

    const dialog = await screen.findByRole('dialog', { name: /edit import list/i });

    fireEvent.change(within(dialog).getByLabelText(/^name/i), {
      target: { value: 'Popular Movies Renamed' },
    });

    const submitButton = within(dialog).getByRole('button', { name: 'Save Changes' });
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });

    await user.click(submitButton);

    await waitFor(() => {
      expect(onUpdateList).toHaveBeenCalledTimes(1);
    });
    expect(onRefreshLists).toHaveBeenCalledTimes(1);

    const [calledId, submitted] = onUpdateList.mock.calls[0]!;
    expect(calledId).toBe(1);
    expect((submitted as UpdateImportListInput).name).toBe('Popular Movies Renamed');
  });

  it('shows delete confirmation when Delete clicked', async () => {
    const user = userEvent.setup();
    renderImportListSettings();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    const cardA = findListCard('Popular Movies');
    await user.click(within(cardA).getByRole('button', { name: /delete/i }));

    const dialog = await screen.findByRole('dialog', { name: /delete import list/i });
    expect(dialog).toBeInTheDocument();

    expect(
      within(dialog).getByRole('heading', { name: 'Delete Import List' }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(/Are you sure you want to delete the import list/),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Delete List' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('calls onDeleteList and refreshes when delete confirmed', async () => {
    const user = userEvent.setup();
    const onDeleteList = vi.fn().mockResolvedValue(undefined);
    const onRefreshLists = vi.fn();
    renderImportListSettings({ onDeleteList, onRefreshLists });

    const cardA = findListCard('Popular Movies');
    await user.click(within(cardA).getByRole('button', { name: /delete/i }));

    const dialog = await screen.findByRole('dialog', { name: /delete import list/i });
    await user.click(within(dialog).getByRole('button', { name: 'Delete List' }));

    await waitFor(() => {
      expect(onDeleteList).toHaveBeenCalledTimes(1);
    });
    expect(onDeleteList).toHaveBeenCalledWith(1);
    expect(onRefreshLists).toHaveBeenCalledTimes(1);
  });

  it('calls onSyncList when Sync clicked', async () => {
    const user = userEvent.setup();
    const onSyncList = vi.fn().mockResolvedValue(undefined);
    renderImportListSettings({ onSyncList });

    const cardB = findListCard('Curated Sci-Fi');
    await user.click(within(cardB).getByRole('button', { name: /^sync$/i }));

    await waitFor(() => {
      expect(onSyncList).toHaveBeenCalledTimes(1);
    });
    expect(onSyncList).toHaveBeenCalledWith(2);
  });

  it('calls onDeleteExclusion and refreshes when exclusion delete confirmed', async () => {
    const user = userEvent.setup();
    const onDeleteExclusion = vi.fn().mockResolvedValue(undefined);
    const onRefreshExclusions = vi.fn();
    renderImportListSettings({ onDeleteExclusion, onRefreshExclusions });

    await user.click(screen.getByRole('button', { name: 'Exclusions' }));

    const table = await screen.findByRole('table');
    const dataRows = within(table).getAllByRole('row').slice(1);
    const movieARow = dataRows.find((row) => within(row).queryByText('Movie A'));
    expect(movieARow).toBeDefined();
    await user.click(within(movieARow!).getByRole('button', { name: /remove/i }));

    const dialog = await screen.findByRole('dialog', { name: /remove exclusion/i });
    expect(dialog).toBeInTheDocument();
    expect(
      within(dialog).getByRole('heading', { name: 'Remove Exclusion' }),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Remove Exclusion' })).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Remove Exclusion' }));

    await waitFor(() => {
      expect(onDeleteExclusion).toHaveBeenCalledTimes(1);
    });
    expect(onDeleteExclusion).toHaveBeenCalledWith(10);
    expect(onRefreshExclusions).toHaveBeenCalledTimes(1);
  });

  it('disables the syncing list Sync button while onSyncList is in-flight (syncingId race)', async () => {
    let resolveSync!: () => void;
    const onSyncList = vi.fn(
      () => new Promise<void>((resolve) => {
        resolveSync = resolve;
      }),
    );
    renderImportListSettings({ onSyncList });

    const cardA = findListCard('Popular Movies');
    const syncButton = within(cardA).getByRole('button', { name: /^sync$/i });

    const user = userEvent.setup();
    await user.click(syncButton);

    await waitFor(() => {
      expect(onSyncList).toHaveBeenCalledTimes(1);
    });
    expect(onSyncList).toHaveBeenCalledWith(1);

    expect(within(cardA).getByRole('button', { name: /syncing/i })).toBeDisabled();

    resolveSync();

    await waitFor(() => {
      expect(within(cardA).getByRole('button', { name: /^sync$/i })).not.toBeDisabled();
    });
  });

  it('disables Save in the list modal while onCreateList is in-flight (isSaving)', async () => {
    let resolveCreate!: () => void;
    const onCreateList = vi.fn(
      () => new Promise<void>((resolve) => {
        resolveCreate = resolve;
      }),
    );
    renderImportListSettings({ onCreateList });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Add Import List' }));

    const dialog = await screen.findByRole('dialog', { name: /add import list/i });
    fireEvent.change(within(dialog).getByLabelText(/^name/i), {
      target: { value: 'Pending List' },
    });
    fireEvent.change(within(dialog).getByLabelText(/root folder/i), {
      target: { value: '/data/pending' },
    });

    const submitButton = within(dialog).getByRole('button', { name: 'Add Import List' });
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });

    await user.click(submitButton);

    await waitFor(() => {
      expect(onCreateList).toHaveBeenCalledTimes(1);
    });

    const stillOpenDialog = await screen.findByRole('dialog', { name: /add import list/i });
    const savingButton = await within(stillOpenDialog).findByRole('button', {
      name: /saving/i,
    });
    expect(savingButton).toBeDisabled();

    resolveCreate();
  });
});
