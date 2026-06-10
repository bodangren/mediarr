import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImportListList } from './ImportListList.js';
import type { ImportList } from '@/lib/api/importListsApi';

const mockListA: ImportList = {
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
  createdAt: '2026-05-26T00:00:00.000Z',
  updatedAt: '2026-05-26T00:00:00.000Z',
  qualityProfile: { id: 1, name: 'HD-1080p' },
};

const mockListB: ImportList = {
  id: 2,
  name: 'Curated Sci-Fi',
  providerType: 'tmdb-list',
  config: { listId: '8228' },
  rootFolderPath: '/media/scifi',
  qualityProfileId: 2,
  languageProfileId: null,
  monitorType: 'all',
  enabled: true,
  syncInterval: 12,
  lastSyncAt: null,
  createdAt: '2026-05-26T00:00:00.000Z',
  updatedAt: '2026-05-26T00:00:00.000Z',
  qualityProfile: { id: 2, name: 'UHD-2160p' },
};

type RenderOverrides = Partial<{
  lists: ImportList[];
  isLoading: boolean;
  error: Error | null;
  onEdit: (list: ImportList) => void;
  onDelete: (list: ImportList) => void;
  onSync: (list: ImportList) => void;
  syncingId: number | null;
}>;

const renderImportListList = (overrides: RenderOverrides = {}) => {
  const onEdit = overrides.onEdit ?? vi.fn();
  const onDelete = overrides.onDelete ?? vi.fn();
  const onSync = overrides.onSync ?? vi.fn();
  const props = {
    lists: overrides.lists ?? [],
    isLoading: overrides.isLoading ?? false,
    error: overrides.error ?? null,
    onEdit,
    onDelete,
    onSync,
    syncingId: overrides.syncingId ?? null,
  };
  const utils = render(<ImportListList {...props} />);
  return { ...utils, onEdit, onDelete, onSync, props };
};

const findListCard = (listName: string): HTMLElement => {
  const heading = screen.getByRole('heading', { name: listName });
  const card = heading.closest('div.rounded-sm');
  if (!card) {
    throw new Error(`Could not locate card container for list "${listName}"`);
  }
  return card as HTMLElement;
};

describe('ImportListList', () => {
  it('renders cards for each import list', () => {
    renderImportListList({ lists: [mockListA, mockListB] });

    expect(
      screen.getByRole('heading', { name: 'Popular Movies' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Curated Sci-Fi' }),
    ).toBeInTheDocument();

    const cardA = findListCard('Popular Movies');
    expect(within(cardA).getByText(/TMDB Popular/)).toBeInTheDocument();
    expect(within(cardA).getByText(/HD-1080p/)).toBeInTheDocument();
    expect(within(cardA).getByText(/\/media\/movies/)).toBeInTheDocument();

    const cardB = findListCard('Curated Sci-Fi');
    expect(within(cardB).getByText(/TMDB List/)).toBeInTheDocument();
    expect(within(cardB).getByText(/UHD-2160p/)).toBeInTheDocument();

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders empty state when lists is empty', () => {
    renderImportListList({ lists: [] });

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent(/no import lists configured/i);

    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('renders error state when error prop is set', () => {
    renderImportListList({
      error: new Error('Network down'),
      lists: [mockListA],
    });

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent(/failed to load import lists/i);

    expect(
      screen.queryByRole('heading', { name: 'Popular Movies' }),
    ).not.toBeInTheDocument();
  });

  it.each([
    { providerType: 'tmdb-popular', expected: 'TMDB Popular' },
    { providerType: 'tmdb-list', expected: 'TMDB List' },
    { providerType: 'unknown-provider', expected: 'unknown-provider' },
  ])(
    'displays provider display name "$expected" for providerType "$providerType"',
    ({ providerType, expected }) => {
      const list: ImportList = {
        ...mockListA,
        id: 42,
        name: `List for ${providerType}`,
        providerType,
      };
      renderImportListList({ lists: [list] });

      const card = findListCard(`List for ${providerType}`);
      expect(within(card).getByText(expected)).toBeInTheDocument();
    },
  );

  it('displays "Never" for lastSyncAt when null', () => {
    const list: ImportList = { ...mockListA, lastSyncAt: null };
    renderImportListList({ lists: [list] });

    const card = findListCard('Popular Movies');
    expect(within(card).getByText('Never')).toBeInTheDocument();
  });

  it('calls onSync with the list object when Sync button is clicked', async () => {
    const user = userEvent.setup();
    const onSync = vi.fn();
    renderImportListList({
      lists: [mockListA, mockListB],
      onSync,
    });

    const cardB = findListCard('Curated Sci-Fi');
    const syncButton = within(cardB).getByRole('button', { name: /^sync$/i });
    await user.click(syncButton);

    expect(onSync).toHaveBeenCalledTimes(1);
    expect(onSync).toHaveBeenCalledWith(mockListB);
  });

  it('calls onEdit with the list object when Edit button is clicked', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    renderImportListList({
      lists: [mockListA, mockListB],
      onEdit,
    });

    const cardB = findListCard('Curated Sci-Fi');
    await user.click(within(cardB).getByRole('button', { name: /edit/i }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(mockListB);
  });

  it('calls onDelete with the list object when Delete button is clicked', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    renderImportListList({
      lists: [mockListA, mockListB],
      onDelete,
    });

    const cardA = findListCard('Popular Movies');
    await user.click(within(cardA).getByRole('button', { name: /delete/i }));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(mockListA);
  });
});
