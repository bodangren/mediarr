import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddExclusionModal } from './AddExclusionModal.js';
import type { CreateExclusionInput, ImportListExclusion } from '@/lib/api/importListsApi';

// Modal interactions with user-event are slow in jsdom; raise the per-test budget.
vi.setConfig({ testTimeout: 15_000 });

const mockExclusion: ImportListExclusion = {
  id: 1,
  importListId: 1,
  tmdbId: 123,
  imdbId: null,
  tvdbId: null,
  title: 'Already Excluded Movie (2020)',
  createdAt: '2026-06-11T00:00:00.000Z',
};

const mockSearchResults = [
  {
    id: 1,
    tmdbId: 550,
    title: 'Fight Club',
    year: 1999,
    overview: 'An insomniac office worker forms an underground fight club.',
    posterUrl: 'https://example.com/fight-club.jpg',
    genres: ['Drama'],
    certification: 'R',
    ratings: { tmdb: 8.4 },
    releaseDate: '1999-10-15',
  },
  {
    id: 2,
    tmdbId: 680,
    title: 'Pulp Fiction',
    year: 1994,
    overview: 'The lives of two mob hitmen intertwine.',
    posterUrl: undefined,
    genres: ['Crime', 'Drama'],
    certification: 'R',
    ratings: { tmdb: 8.9 },
    releaseDate: '1994-10-14',
  },
];

const mockSearchMovies = vi.fn();

type RenderOverrides = Partial<{
  isOpen: boolean;
  onClose: () => void;
  onAdd: (input: CreateExclusionInput) => Promise<void> | void;
  existingExclusions: ImportListExclusion[];
  isLoading: boolean;
  searchMovies: typeof mockSearchMovies;
}>;

const renderAddExclusionModal = (overrides: RenderOverrides = {}) => {
  const onClose = overrides.onClose ?? vi.fn();
  const onAdd = overrides.onAdd ?? vi.fn().mockResolvedValue(undefined);
  const utils = render(
    <AddExclusionModal
      isOpen={overrides.isOpen ?? true}
      onClose={onClose}
      onAdd={onAdd}
      existingExclusions={overrides.existingExclusions ?? []}
      isLoading={overrides.isLoading ?? false}
      searchMovies={overrides.searchMovies ?? mockSearchMovies}
    />,
  );
  return { ...utils, onClose, onAdd };
};

const getResultButton = (title: string): HTMLButtonElement => {
  const titleEl = screen.getByText(title);
  const button = titleEl.closest('button');
  if (!button) {
    throw new Error(`Could not find button wrapping result "${title}"`);
  }
  return button as HTMLButtonElement;
};

describe('AddExclusionModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchMovies.mockResolvedValue({ results: mockSearchResults });
  });

  it('renders search input and search button', () => {
    renderAddExclusionModal();

    const searchInput = screen.getByPlaceholderText(/search for a movie or tv series/i);
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveValue('');

    const searchButton = screen.getByRole('button', { name: /^search$/i });
    expect(searchButton).toBeInTheDocument();
    expect(searchButton).toBeDisabled();

    const cancelButton = screen.getByRole('button', { name: /^cancel$/i });
    expect(cancelButton).toBeInTheDocument();

    const addButton = screen.getByRole('button', { name: /^add exclusion$/i });
    expect(addButton).toBeInTheDocument();
    expect(addButton).toBeDisabled();
  });

  it('displays search results after successful search', async () => {
    const user = userEvent.setup({ delay: null });
    renderAddExclusionModal();

    const searchInput = screen.getByPlaceholderText(/search for a movie or tv series/i);
    await user.type(searchInput, 'Fight Club');

    const searchButton = screen.getByRole('button', { name: /^search$/i });
    await user.click(searchButton);

    await waitFor(() => {
      expect(mockSearchMovies).toHaveBeenCalledTimes(1);
    });
    expect(mockSearchMovies).toHaveBeenCalledWith({ query: 'Fight Club' });

    expect(await screen.findByText('Fight Club')).toBeInTheDocument();
    expect(screen.getByText('Pulp Fiction')).toBeInTheDocument();
    expect(screen.getByText('(1999)')).toBeInTheDocument();
    expect(screen.getByText('(1994)')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: /search results/i })).toBeInTheDocument();
  });

  it('shows error alert when search fails', async () => {
    const user = userEvent.setup({ delay: null });
    mockSearchMovies.mockRejectedValueOnce(new Error('boom'));

    renderAddExclusionModal();

    const searchInput = screen.getByPlaceholderText(/search for a movie or tv series/i);
    await user.type(searchInput, 'Dune');

    const searchButton = screen.getByRole('button', { name: /^search$/i });
    await user.click(searchButton);

    const alert = await screen.findByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent(/failed to search/i);

    expect(screen.queryByText('Fight Club')).not.toBeInTheDocument();
    expect(screen.queryByText('Pulp Fiction')).not.toBeInTheDocument();
  });

  it('selects a result when clicked and enables Add Exclusion button', async () => {
    const user = userEvent.setup({ delay: null });
    renderAddExclusionModal();

    const searchInput = screen.getByPlaceholderText(/search for a movie or tv series/i);
    await user.type(searchInput, 'Fight Club');

    const searchButton = screen.getByRole('button', { name: /^search$/i });
    await user.click(searchButton);

    const resultButton = getResultButton('Fight Club');
    await user.click(resultButton);

    const addButton = screen.getByRole('button', { name: /^add exclusion$/i });
    await waitFor(() => {
      expect(addButton).not.toBeDisabled();
    });

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/selected for exclusion/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/TMDB ID: 550/)).toBeInTheDocument();
  });

  it('disables result that matches existing exclusion and shows Already excluded label', async () => {
    const user = userEvent.setup({ delay: null });
    mockSearchMovies.mockResolvedValueOnce({
      results: [
        {
          id: 1,
          tmdbId: 123,
          title: 'Already Excluded Movie',
          year: 2020,
          overview: 'A movie that is already excluded.',
          posterUrl: undefined,
          genres: [],
          ratings: { tmdb: 7.0 },
          releaseDate: '2020-01-01',
        },
        {
          id: 2,
          tmdbId: 456,
          title: 'New Movie',
          year: 2021,
          overview: 'A new movie to exclude.',
          posterUrl: undefined,
          genres: [],
          ratings: { tmdb: 8.0 },
          releaseDate: '2021-01-01',
        },
      ],
    });

    renderAddExclusionModal({ existingExclusions: [mockExclusion] });

    const searchInput = screen.getByPlaceholderText(/search for a movie or tv series/i);
    await user.type(searchInput, 'exclusion test');

    const searchButton = screen.getByRole('button', { name: /^search$/i });
    await user.click(searchButton);

    await screen.findByText('Already Excluded Movie');

    const excludedButton = getResultButton('Already Excluded Movie');
    expect(excludedButton).toBeDisabled();

    const newButton = getResultButton('New Movie');
    expect(newButton).not.toBeDisabled();

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Already Excluded Movie')).toBeInTheDocument();
    expect(within(dialog).getByText('Already excluded')).toBeInTheDocument();
  });

  it('calls onAdd with tmdbId and formatted title when Add Exclusion is clicked', async () => {
    const user = userEvent.setup({ delay: null });
    const onAdd = vi.fn().mockResolvedValue(undefined);
    renderAddExclusionModal({ onAdd });

    const searchInput = screen.getByPlaceholderText(/search for a movie or tv series/i);
    await user.type(searchInput, 'Fight Club');

    const searchButton = screen.getByRole('button', { name: /^search$/i });
    await user.click(searchButton);

    const resultButton = getResultButton('Fight Club');
    await user.click(resultButton);

    const addButton = screen.getByRole('button', { name: /^add exclusion$/i });
    await waitFor(() => {
      expect(addButton).not.toBeDisabled();
    });
    await user.click(addButton);

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledTimes(1);
    });

    const submitted = onAdd.mock.calls[0]![0] as CreateExclusionInput;
    expect(submitted.tmdbId).toBe(550);
    expect(submitted.title).toBe('Fight Club (1999)');
  });

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup({ delay: null });
    const onClose = vi.fn();
    renderAddExclusionModal({ onClose });

    const cancelButton = screen.getByRole('button', { name: /^cancel$/i });
    await user.click(cancelButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('resets state when modal closes and reopens', async () => {
    const user = userEvent.setup({ delay: null });
    const onClose = vi.fn();
    const onAdd = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(
      <AddExclusionModal
        isOpen
        onClose={onClose}
        onAdd={onAdd}
        existingExclusions={[]}
        searchMovies={mockSearchMovies}
      />,
    );

    const searchInput = screen.getByPlaceholderText(/search for a movie or tv series/i);
    await user.type(searchInput, 'Fight Club');

    const searchButton = screen.getByRole('button', { name: /^search$/i });
    await user.click(searchButton);

    await screen.findByText('Fight Club');

    const resultButton = getResultButton('Fight Club');
    await user.click(resultButton);

    expect(searchInput).toHaveValue('Fight Club');

    rerender(
      <AddExclusionModal
        isOpen={false}
        onClose={onClose}
        onAdd={onAdd}
        existingExclusions={[]}
        searchMovies={mockSearchMovies}
      />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    rerender(
      <AddExclusionModal
        isOpen
        onClose={onClose}
        onAdd={onAdd}
        existingExclusions={[]}
        searchMovies={mockSearchMovies}
      />,
    );

    const reopenedInput = screen.getByPlaceholderText(/search for a movie or tv series/i) as HTMLInputElement;
    expect(reopenedInput.value).toBe('');

    expect(screen.queryByText('Fight Club')).not.toBeInTheDocument();
    expect(screen.queryByText('Pulp Fiction')).not.toBeInTheDocument();

    const reopenedAddButton = screen.getByRole('button', { name: /^add exclusion$/i });
    expect(reopenedAddButton).toBeDisabled();
  });

  it('does not search when query is only whitespace', async () => {
    const user = userEvent.setup({ delay: null });
    renderAddExclusionModal();

    const searchInput = screen.getByPlaceholderText(/search for a movie or tv series/i);
    await user.type(searchInput, '   ');

    const searchButton = screen.getByRole('button', { name: /^search$/i });
    expect(searchButton).toBeDisabled();

    await user.click(searchButton);
    expect(mockSearchMovies).not.toHaveBeenCalled();
  });

  it('shows no results message when search returns an empty list', async () => {
    const user = userEvent.setup({ delay: null });
    mockSearchMovies.mockResolvedValueOnce({ results: [] });
    renderAddExclusionModal();

    const searchInput = screen.getByPlaceholderText(/search for a movie or tv series/i);
    await user.type(searchInput, 'NothingHere');

    await user.click(screen.getByRole('button', { name: /^search$/i }));

    await waitFor(() => {
      expect(mockSearchMovies).toHaveBeenCalledWith({ query: 'NothingHere' });
    });

    expect(screen.getByText(/no results found for/i)).toHaveTextContent('NothingHere');
    expect(screen.queryByRole('heading', { name: /search results/i })).not.toBeInTheDocument();
  });

  it('renders "No Image" placeholder for results without a poster', async () => {
    const user = userEvent.setup({ delay: null });
    renderAddExclusionModal();

    const searchInput = screen.getByPlaceholderText(/search for a movie or tv series/i);
    await user.type(searchInput, 'Fight Club');

    await user.click(screen.getByRole('button', { name: /^search$/i }));

    await waitFor(() => {
      expect(screen.getByText('Pulp Fiction')).toBeInTheDocument();
    });

    const resultButton = getResultButton('Pulp Fiction');
    expect(within(resultButton).getByText('No Image')).toBeInTheDocument();
  });
});
