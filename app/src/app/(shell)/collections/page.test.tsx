import { beforeEach, describe, afterEach, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CollectionsPage from './page';

vi.mock('@/lib/mocks/collectionMocks', () => ({
  mockCollections: [
    {
      id: 1,
      tmdbId: 86311,
      name: 'The Avengers Collection',
      overview: 'The Avengers film series produced by Marvel Studios.',
      posterUrl: 'https://via.placeholder.com/300x450?text=Avengers',
      movieCount: 6,
      moviesInLibrary: 5,
      monitored: true,
      movies: [],
    },
    {
      id: 2,
      tmdbId: 10,
      name: 'Star Wars Collection',
      overview: 'The Star Wars saga.',
      posterUrl: 'https://via.placeholder.com/300x450?text=Star+Wars',
      movieCount: 9,
      moviesInLibrary: 7,
      monitored: false,
      movies: [],
    },
  ],
}));

const originalAlert = window.alert;

describe('CollectionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
  });

  afterEach(() => {
    window.alert = originalAlert;
  });

  it('renders page header', () => {
    render(<CollectionsPage />);

    expect(screen.getByText('Collections')).toBeInTheDocument();
    expect(screen.getByText(/Manage movie collections/)).toBeInTheDocument();
  });

  it('displays monitored count', () => {
    render(<CollectionsPage />);

    expect(screen.getByText(/1 of 2 monitored/)).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<CollectionsPage />);

    expect(screen.getByLabelText('Search collections')).toBeInTheDocument();
  });

  it('displays all collections', () => {
    render(<CollectionsPage />);

    expect(screen.getByText('The Avengers Collection')).toBeInTheDocument();
    expect(screen.getByText('Star Wars Collection')).toBeInTheDocument();
  });

  it('filters collections based on search', async () => {
    const user = userEvent.setup();
    render(<CollectionsPage />);

    const searchInput = screen.getByLabelText('Search collections');
    await user.type(searchInput, 'Avengers');

    expect(screen.getByText('The Avengers Collection')).toBeInTheDocument();
    expect(screen.queryByText('Star Wars Collection')).not.toBeInTheDocument();
  });

  it('toggles collection monitoring', async () => {
    const user = userEvent.setup();
    render(<CollectionsPage />);

    const card = screen.getByText('The Avengers Collection').closest('article');
    if (!card) throw new Error('Card not found');

    const toggleButton = card.querySelector('button');
    if (!toggleButton) throw new Error('Toggle button not found');

    await user.click(toggleButton);

    await waitFor(() => {
      expect(card).toHaveTextContent(/Avengers/);
    });
  });

  it('opens edit modal when edit button is clicked', async () => {
    const user = userEvent.setup();
    render(<CollectionsPage />);

    const card = screen.getByText('The Avengers Collection').closest('article');
    if (!card) throw new Error('Card not found');

    await userEvent.hover(card);

    const editButton = screen.getByLabelText(/Edit The Avengers Collection/);
    await user.click(editButton);

    expect(screen.getByText('Edit Collection')).toBeInTheDocument();
  });

  it('confirms deletion when delete button is clicked', async () => {
    const user = userEvent.setup();
    window.confirm = vi.fn(() => true);

    render(<CollectionsPage />);

    const card = screen.getByText('The Avengers Collection').closest('article');
    if (!card) throw new Error('Card not found');

    await userEvent.hover(card);

    const deleteButton = screen.getByLabelText(/Delete The Avengers Collection/);

    // Mock confirm to return true
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    await user.click(deleteButton);

    expect(confirmSpy).toHaveBeenCalledWith('Delete collection "The Avengers Collection"?');
    confirmSpy.mockRestore();
  });

  it('does not delete when confirmation is cancelled', async () => {
    const user = userEvent.setup();
    render(<CollectionsPage />);

    const card = screen.getByText('The Avengers Collection').closest('article');
    if (!card) throw new Error('Card not found');

    await userEvent.hover(card);

    const deleteButton = screen.getByLabelText(/Delete The Avengers Collection/);

    // Mock confirm to return false
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await user.click(deleteButton);

    expect(confirmSpy).toHaveBeenCalledWith('Delete collection "The Avengers Collection"?');
    expect(screen.getByText('The Avengers Collection')).toBeInTheDocument();
    confirmSpy.mockRestore();
  });

  it('triggers search action when search button is clicked', async () => {
    const user = userEvent.setup();
    render(<CollectionsPage />);

    const card = screen.getByText('The Avengers Collection').closest('article');
    if (!card) throw new Error('Card not found');

    await userEvent.hover(card);

    const searchButton = screen.getByLabelText(/Search The Avengers Collection/);
    await user.click(searchButton);

    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Searching for missing movies'));
  });

  it('displays empty state when no collections match search', async () => {
    const user = userEvent.setup();
    render(<CollectionsPage />);

    const searchInput = screen.getByLabelText('Search collections');
    await user.type(searchInput, 'NonExistentCollection');

    expect(screen.getByText('No collections found')).toBeInTheDocument();
  });
});
