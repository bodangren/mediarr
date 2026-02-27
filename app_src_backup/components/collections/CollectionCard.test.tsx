import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { CollectionCard } from './CollectionCard';
import type { MovieCollection } from '@/types/collection';

const mockOnToggleMonitored = vi.fn();
const mockOnSearch = vi.fn();
const mockOnEdit = vi.fn();
const mockOnDelete = vi.fn();

const mockCollection: MovieCollection = {
  id: 1,
  tmdbId: 86311,
  name: 'The Avengers Collection',
  overview: 'The Avengers film series produced by Marvel Studios.',
  posterUrl: 'https://via.placeholder.com/300x450?text=Avengers',
  movieCount: 6,
  moviesInLibrary: 5,
  monitored: true,
  movies: [],
};

describe('CollectionCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders collection card with all elements', () => {
    render(
      <CollectionCard
        collection={mockCollection}
        onToggleMonitored={mockOnToggleMonitored}
        onSearch={mockOnSearch}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('The Avengers Collection')).toBeInTheDocument();
    expect(screen.getByText(/The Avengers film series/)).toBeInTheDocument();
    expect(screen.getByText('5 of 6 movies in library')).toBeInTheDocument();
  });

  it('displays poster image', () => {
    render(
      <CollectionCard
        collection={mockCollection}
        onToggleMonitored={mockOnToggleMonitored}
        onSearch={mockOnSearch}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const poster = screen.getByAltText('The Avengers Collection');
    expect(poster).toBeInTheDocument();
    expect(poster).toHaveClass('object-cover');
  });

  it('shows monitoring toggle state correctly', () => {
    render(
      <CollectionCard
        collection={mockCollection}
        onToggleMonitored={mockOnToggleMonitored}
        onSearch={mockOnSearch}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const toggleButton = screen.getByLabelText('Disable monitoring');
    expect(toggleButton).toBeInTheDocument();
  });

  it('shows unmonitored state correctly', () => {
    const unmonitoredCollection = { ...mockCollection, monitored: false };

    render(
      <CollectionCard
        collection={unmonitoredCollection}
        onToggleMonitored={mockOnToggleMonitored}
        onSearch={mockOnSearch}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const toggleButton = screen.getByLabelText('Enable monitoring');
    expect(toggleButton).toBeInTheDocument();
  });

  it('calls onToggleMonitored when toggle button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <CollectionCard
        collection={mockCollection}
        onToggleMonitored={mockOnToggleMonitored}
        onSearch={mockOnSearch}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const toggleButton = screen.getByLabelText('Disable monitoring');
    await user.click(toggleButton);

    expect(mockOnToggleMonitored).toHaveBeenCalledWith(1, false);
  });

  it('displays movie count badge', () => {
    render(
      <CollectionCard
        collection={mockCollection}
        onToggleMonitored={mockOnToggleMonitored}
        onSearch={mockOnSearch}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('5/6')).toBeInTheDocument();
  });

  it('calculates and displays progress bar correctly', () => {
    render(
      <CollectionCard
        collection={mockCollection}
        onToggleMonitored={mockOnToggleMonitored}
        onSearch={mockOnSearch}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '83.33');
  });

  it('shows hover actions on card hover', async () => {
    render(
      <CollectionCard
        collection={mockCollection}
        onToggleMonitored={mockOnToggleMonitored}
        onSearch={mockOnSearch}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const card = screen.getByText('The Avengers Collection').closest('article');
    if (!card) throw new Error('Card not found');

    await userEvent.hover(card);

    expect(screen.getByLabelText(/Search The Avengers Collection/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Edit The Avengers Collection/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Delete The Avengers Collection/)).toBeInTheDocument();
  });

  it('calls onSearch when search button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <CollectionCard
        collection={mockCollection}
        onToggleMonitored={mockOnToggleMonitored}
        onSearch={mockOnSearch}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const card = screen.getByText('The Avengers Collection').closest('article');
    if (!card) throw new Error('Card not found');

    await userEvent.hover(card);

    const searchButton = screen.getByLabelText(/Search The Avengers Collection/);
    await user.click(searchButton);

    expect(mockOnSearch).toHaveBeenCalledWith(1);
  });

  it('calls onEdit when edit button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <CollectionCard
        collection={mockCollection}
        onToggleMonitored={mockOnToggleMonitored}
        onSearch={mockOnSearch}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const card = screen.getByText('The Avengers Collection').closest('article');
    if (!card) throw new Error('Card not found');

    await userEvent.hover(card);

    const editButton = screen.getByLabelText(/Edit The Avengers Collection/);
    await user.click(editButton);

    expect(mockOnEdit).toHaveBeenCalledWith(mockCollection);
  });

  it('calls onDelete when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <CollectionCard
        collection={mockCollection}
        onToggleMonitored={mockOnToggleMonitored}
        onSearch={mockOnSearch}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const card = screen.getByText('The Avengers Collection').closest('article');
    if (!card) throw new Error('Card not found');

    await userEvent.hover(card);

    const deleteButton = screen.getByLabelText(/Delete The Avengers Collection/);
    await user.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith(1);
  });

  it('handles missing poster with fallback', () => {
    const collectionWithoutPoster = { ...mockCollection, posterUrl: undefined };

    render(
      <CollectionCard
        collection={collectionWithoutPoster}
        onToggleMonitored={mockOnToggleMonitored}
        onSearch={mockOnSearch}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const poster = screen.getByAltText('The Avengers Collection');
    expect(poster).toHaveAttribute('src', '/images/placeholder-poster.png');
  });
});
