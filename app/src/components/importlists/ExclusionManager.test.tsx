import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExclusionManager } from './ExclusionManager.js';
import type { ImportListExclusion } from '@/lib/api/importListsApi';

vi.setConfig({ testTimeout: 15_000 });

const mockExclusionA: ImportListExclusion = {
  id: 1,
  importListId: 1,
  tmdbId: 100,
  imdbId: 'tt100',
  tvdbId: null,
  title: 'Movie A',
  createdAt: '2026-05-26T00:00:00.000Z',
};

const mockExclusionB: ImportListExclusion = {
  id: 2,
  importListId: 1,
  tmdbId: 200,
  imdbId: null,
  tvdbId: 50,
  title: 'Movie B',
  createdAt: '2026-05-26T00:00:00.000Z',
};

const mockExclusionC: ImportListExclusion = {
  id: 3,
  importListId: null,
  tmdbId: 300,
  imdbId: null,
  tvdbId: null,
  title: 'Movie C',
  createdAt: '2026-05-26T00:00:00.000Z',
};

const noop = () => Promise.resolve();

const renderExclusionManager = (overrides: Partial<{
  exclusions: ImportListExclusion[];
  isLoading: boolean;
  error: Error | null;
  onAddExclusion: () => void;
  onRemoveExclusion: (exclusion: ImportListExclusion) => void;
  isDeleting: boolean;
}> = {}) => {
  const onAddExclusion = overrides.onAddExclusion ?? vi.fn();
  const onRemoveExclusion = overrides.onRemoveExclusion ?? vi.fn();
  const props = {
    exclusions: overrides.exclusions ?? [],
    isLoading: overrides.isLoading ?? false,
    error: overrides.error ?? null,
    onAddExclusion,
    onRemoveExclusion,
    isDeleting: overrides.isDeleting ?? false,
  };
  const utils = render(<ExclusionManager {...props} />);
  return { ...utils, onAddExclusion, onRemoveExclusion, props };
};

describe('ExclusionManager', () => {
  it('renders table rows for each exclusion', () => {
    renderExclusionManager({
      exclusions: [mockExclusionA, mockExclusionB],
    });

    expect(screen.getByText('Movie A')).toBeInTheDocument();
    expect(screen.getByText('Movie B')).toBeInTheDocument();

    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(3);

    const headerRow = rows[0];
    expect(within(headerRow).getByText('Title')).toBeInTheDocument();
    expect(within(headerRow).getByText('TMDB ID')).toBeInTheDocument();
    expect(within(headerRow).getByText('IMDB ID')).toBeInTheDocument();
    expect(within(headerRow).getByText('TVDB ID')).toBeInTheDocument();
    expect(within(headerRow).getByText('Actions')).toBeInTheDocument();
  });

  it('renders empty state when exclusions is empty', () => {
    renderExclusionManager({ exclusions: [] });

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('No exclusions configured');

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders error state when error prop is set', () => {
    renderExclusionManager({ error: new Error('Failed to load') });

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('Failed to load');

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders loading state when isLoading is true', () => {
    renderExclusionManager({
      isLoading: true,
      exclusions: [mockExclusionA, mockExclusionB],
    });

    expect(screen.getByText('Loading exclusions...')).toBeInTheDocument();

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('calls onRemoveExclusion with correct exclusion when Remove is clicked', async () => {
    const user = userEvent.setup({ delay: null });
    const onRemoveExclusion = vi.fn();
    renderExclusionManager({
      exclusions: [mockExclusionA, mockExclusionB, mockExclusionC],
      onRemoveExclusion,
    });

    const table = screen.getByRole('table');
    const dataRows = within(table).getAllByRole('row').slice(1);
    const removeButtons = dataRows.map((row) =>
      within(row).getByRole('button', { name: /remove/i }),
    );

    await user.click(removeButtons[1]);

    expect(onRemoveExclusion).toHaveBeenCalledTimes(1);
    expect(onRemoveExclusion).toHaveBeenCalledWith(mockExclusionB);
  });

  it('calls onAddExclusion when Add Exclusion button is clicked', async () => {
    const user = userEvent.setup({ delay: null });
    const onAddExclusion = vi.fn();
    renderExclusionManager({
      exclusions: [mockExclusionA],
      onAddExclusion,
    });

    await user.click(screen.getByRole('button', { name: /add exclusion/i }));

    expect(onAddExclusion).toHaveBeenCalledTimes(1);
  });

  it('disables Remove buttons when isDeleting is true', () => {
    renderExclusionManager({
      exclusions: [mockExclusionA, mockExclusionB],
      isDeleting: true,
    });

    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    expect(removeButtons).toHaveLength(2);
    for (const button of removeButtons) {
      expect(button).toBeDisabled();
    }
  });
});
