import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import DiscoverMoviesPage from './page';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}));

describe('DiscoverMoviesPage', () => {
  const renderPage = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <DiscoverMoviesPage />
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page header and mode tabs', () => {
    renderPage();

    expect(screen.getByText('Discover Movies')).toBeInTheDocument();
    expect(screen.getByText(/browse and discover/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /popular/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /top rated/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new releases/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upcoming/i })).toBeInTheDocument();
  });

  it('renders filters toggle button', () => {
    renderPage();

    expect(screen.getByRole('button', { name: /filters/i })).toBeInTheDocument();
  });

  it('displays movie cards', () => {
    renderPage();

    const movieCards = screen.getAllByText(/movie/i);
    expect(movieCards.length).toBeGreaterThan(0);
  });

  it('displays results count', () => {
    renderPage();

    expect(screen.getByText(/\d+ results/)).toBeInTheDocument();
  });

  it('switches between discovery modes', async () => {
    const user = userEvent.setup();
    renderPage();

    const topRatedButton = screen.getByRole('button', { name: /top rated/i });
    await user.click(topRatedButton);

    expect(topRatedButton).toHaveClass('border-accent-primary');
  });

  it('opens filters on mobile when filter button is clicked', async () => {
    const user = userEvent.setup();
    renderPage();

    const filterButton = screen.getByRole('button', { name: /filters/i });
    await user.click(filterButton);

    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });

  it('closes mobile filter modal when close button is clicked', async () => {
    const user = userEvent.setup();
    renderPage();

    const filterButton = screen.getByRole('button', { name: /filters/i });
    await user.click(filterButton);

    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
    });
  });

  it('navigates to add page when movie is added', async () => {
    const user = userEvent.setup();
    const { useRouter } = require('next/navigation');
    const mockPush = vi.fn();
    useRouter.mockReturnValue({ push: mockPush });

    renderPage();

    const addButton = screen.getAllByText(/add to library/i)[0];
    await user.click(addButton);

    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/add/new'));
  });

  it('disables add button for movies already in library', async () => {
    renderPage();

    const alreadyAddedButtons = screen.getAllByText('Already Added');
    expect(alreadyAddedButtons.length).toBeGreaterThan(0);

    alreadyAddedButtons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('displays rating badges on movie cards', () => {
    renderPage();

    const ratingBadges = screen.getAllByText(/⭐/);
    expect(ratingBadges.length).toBeGreaterThan(0);
  });

  it('displays year and certification on movie cards', () => {
    renderPage();

    const years = screen.getAllByText(/\d{4}/);
    expect(years.length).toBeGreaterThan(0);
  });
});
