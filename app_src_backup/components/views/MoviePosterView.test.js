import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MoviePosterView } from './MoviePosterView';
const mockMovies = [
    {
        id: 1,
        title: 'The Matrix',
        year: 1999,
        status: 'released',
        monitored: true,
        posterUrl: '/test-poster.jpg',
        runtime: 136,
        certification: 'R',
        ratings: { tmdb: 8.2, imdb: 8.7 },
        fileVariants: [{ id: 1, path: '/path/to/matrix.mkv' }],
    },
    {
        id: 2,
        title: 'Inception',
        year: 2010,
        status: 'released',
        monitored: false,
        posterUrl: '/test-poster2.jpg',
        runtime: 148,
        certification: 'PG-13',
        ratings: { tmdb: 8.4, imdb: 8.8 },
        fileVariants: [],
    },
    {
        id: 3,
        title: 'The Dark Knight',
        year: 2008,
        status: 'released',
        monitored: true,
        posterUrl: undefined,
        runtime: 152,
        certification: 'PG-13',
        ratings: { tmdb: 8.5, imdb: 9.0 },
        fileVariants: [{ id: 1, path: '/path/to/dark-knight.mkv' }],
    },
];
describe('MoviePosterView', () => {
    it('renders movie poster cards', () => {
        const onToggleMonitored = vi.fn();
        render(_jsx(MoviePosterView, { items: mockMovies, onToggleMonitored: onToggleMonitored }));
        expect(screen.getByText('The Matrix')).toBeInTheDocument();
        expect(screen.getByText('Inception')).toBeInTheDocument();
        expect(screen.getByText('The Dark Knight')).toBeInTheDocument();
        expect(screen.getByText('1999')).toBeInTheDocument();
        expect(screen.getByText('2010')).toBeInTheDocument();
        expect(screen.getByText('2008')).toBeInTheDocument();
    });
    it('calls onToggleMonitored when monitoring button is clicked', () => {
        const onToggleMonitored = vi.fn();
        render(_jsx(MoviePosterView, { items: mockMovies, onToggleMonitored: onToggleMonitored }));
        const firstMovieCard = screen.getByText('The Matrix').closest('a');
        const toggleButton = firstMovieCard?.querySelector('button[aria-label*="Disable"]');
        expect(toggleButton).toBeInTheDocument();
        if (toggleButton) {
            fireEvent.click(toggleButton);
            expect(onToggleMonitored).toHaveBeenCalledWith(1, false);
        }
    });
    it('calls onDelete when delete button is clicked', () => {
        const onToggleMonitored = vi.fn();
        const onDelete = vi.fn();
        // Mock window.confirm
        window.confirm = vi.fn(() => true);
        render(_jsx(MoviePosterView, { items: mockMovies, onToggleMonitored: onToggleMonitored, onDelete: onDelete }));
        // First hover over the card to show action buttons
        const firstMovieCard = screen.getByText('The Matrix').closest('a');
        if (firstMovieCard) {
            fireEvent.mouseEnter(firstMovieCard);
            // Then find and click delete button
            const deleteButton = firstMovieCard.querySelector('button[aria-label*="Delete"]');
            expect(deleteButton).toBeInTheDocument();
            if (deleteButton) {
                fireEvent.click(deleteButton);
                expect(window.confirm).toHaveBeenCalledWith('Delete The Matrix?');
                expect(onDelete).toHaveBeenCalledWith(1);
            }
        }
    });
    it('calls onSearch when search button is clicked', () => {
        const onToggleMonitored = vi.fn();
        const onSearch = vi.fn();
        render(_jsx(MoviePosterView, { items: mockMovies, onToggleMonitored: onToggleMonitored, onSearch: onSearch }));
        // Hover over the card to show action buttons
        const firstMovieCard = screen.getByText('The Matrix').closest('a');
        if (firstMovieCard) {
            fireEvent.mouseEnter(firstMovieCard);
            // Find and click search button
            const searchButton = firstMovieCard.querySelector('button[aria-label*="Search"]');
            expect(searchButton).toBeInTheDocument();
            if (searchButton) {
                fireEvent.click(searchButton);
                expect(onSearch).toHaveBeenCalledWith(1);
            }
        }
    });
    it('displays empty state when no items', () => {
        const onToggleMonitored = vi.fn();
        render(_jsx(MoviePosterView, { items: [], onToggleMonitored: onToggleMonitored }));
        expect(screen.getByText('No movies found')).toBeInTheDocument();
    });
    it('displays rating badge', () => {
        const onToggleMonitored = vi.fn();
        render(_jsx(MoviePosterView, { items: mockMovies, onToggleMonitored: onToggleMonitored }));
        // Check for rating display
        expect(screen.getByText('⭐ 8.2')).toBeInTheDocument();
        expect(screen.getByText('⭐ 8.4')).toBeInTheDocument();
    });
    it('displays runtime and certification', () => {
        const onToggleMonitored = vi.fn();
        render(_jsx(MoviePosterView, { items: mockMovies, onToggleMonitored: onToggleMonitored }));
        // Check for runtime display - all 3 mock movies have runtimes
        const runtimes = screen.getAllByText(/2h \d+m/);
        expect(runtimes.length).toBe(3);
        expect(screen.getByText('2h 16m')).toBeInTheDocument(); // 136 minutes
        expect(screen.getByText('2h 28m')).toBeInTheDocument(); // 148 minutes
        expect(screen.getByText('2h 32m')).toBeInTheDocument(); // 152 minutes
        // Check for certification - use getAllByText since both R and PG-13 appear
        const certifications = screen.getAllByText(/R|PG-13/);
        expect(certifications.length).toBeGreaterThan(0);
    });
    it('navigates to movie detail when card is clicked', () => {
        const onToggleMonitored = vi.fn();
        render(_jsx(MoviePosterView, { items: mockMovies, onToggleMonitored: onToggleMonitored }));
        const link = screen.getByText('The Matrix').closest('a');
        expect(link).toHaveAttribute('href', '/library/movies/1');
    });
    it('shows loading skeletons when isLoading is true', () => {
        const onToggleMonitored = vi.fn();
        render(_jsx(MoviePosterView, { items: [], onToggleMonitored: onToggleMonitored, isLoading: true }));
        // Check that skeleton elements are rendered
        const skeletons = document.querySelectorAll('.animate-pulse');
        expect(skeletons.length).toBeGreaterThan(0);
        // Ensure no movie text is visible
        expect(screen.queryByText('The Matrix')).not.toBeInTheDocument();
    });
    it('handles missing posterUrl with fallback', () => {
        const onToggleMonitored = vi.fn();
        render(_jsx(MoviePosterView, { items: [mockMovies[2]], onToggleMonitored: onToggleMonitored }));
        // Should still render the card without posterUrl
        expect(screen.getByText('The Dark Knight')).toBeInTheDocument();
        const card = screen.getByText('The Dark Knight').closest('a');
        const img = card?.querySelector('img');
        expect(img).toHaveAttribute('src', '/images/placeholder-poster.png');
    });
});
//# sourceMappingURL=MoviePosterView.test.js.map