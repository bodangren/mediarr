import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { CollectionGrid } from './CollectionGrid';
import type { MovieCollection } from '@/types/collection';

const mockOnToggleMonitored = vi.fn();
const mockOnSearch = vi.fn();
const mockOnEdit = vi.fn();
const mockOnDelete = vi.fn();
const mockOnNavigate = vi.fn();

const mockCollections: MovieCollection[] = [
  {
    id: 1,
    tmdbCollectionId: 86311,
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
    tmdbCollectionId: 10,
    name: 'Star Wars Collection',
    overview: 'The Star Wars saga.',
    posterUrl: 'https://via.placeholder.com/300x450?text=Star+Wars',
    movieCount: 9,
    moviesInLibrary: 7,
    monitored: false,
    movies: [],
  },
];

describe('CollectionGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all collections when provided', () => {
    render(
      <CollectionGrid
        collections={mockCollections}
        onToggleMonitored={mockOnToggleMonitored}
        onSearch={mockOnSearch}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('The Avengers Collection')).toBeInTheDocument();
    expect(screen.getByText('Star Wars Collection')).toBeInTheDocument();
  });

  it('renders empty state when no collections', () => {
    render(
      <CollectionGrid
        collections={[]}
        onToggleMonitored={mockOnToggleMonitored}
        onSearch={mockOnSearch}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('No collections found')).toBeInTheDocument();
  });

  it('displays correct grid layout', () => {
    const { container } = render(
      <CollectionGrid
        collections={mockCollections}
        onToggleMonitored={mockOnToggleMonitored}
        onSearch={mockOnSearch}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const grid = container.querySelector('.grid');
    expect(grid).toHaveClass('grid');
    expect(grid).toHaveClass('grid-cols-1');
    expect(grid).toHaveClass('sm:grid-cols-2');
    expect(grid).toHaveClass('md:grid-cols-3');
    expect(grid).toHaveClass('lg:grid-cols-4');
  });

  it('passes props to child cards', () => {
    render(
      <CollectionGrid
        collections={mockCollections}
        onToggleMonitored={mockOnToggleMonitored}
        onSearch={mockOnSearch}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const avengersCard = screen.getByText('The Avengers Collection');
    expect(avengersCard.closest('article')).toBeInTheDocument();

    const starWarsCard = screen.getByText('Star Wars Collection');
    expect(starWarsCard.closest('article')).toBeInTheDocument();
  });

  it('passes onNavigate to child cards and invokes it on poster click', async () => {
    const user = userEvent.setup();
    render(
      <CollectionGrid
        collections={mockCollections}
        onToggleMonitored={mockOnToggleMonitored}
        onSearch={mockOnSearch}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onNavigate={mockOnNavigate}
      />
    );

    const poster = screen.getByAltText('The Avengers Collection');
    await user.click(poster);

    expect(mockOnNavigate).toHaveBeenCalledWith(1);
  });
});
