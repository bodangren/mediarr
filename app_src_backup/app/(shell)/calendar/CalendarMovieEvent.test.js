import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { CalendarMovieEvent } from './CalendarMovieEvent';
describe('CalendarMovieEvent', () => {
    const mockMovie = {
        id: 1,
        movieId: 101,
        title: 'Dune: Part Two',
        releaseType: 'cinema',
        releaseDate: '2024-03-01',
        posterUrl: 'https://example.com/poster.jpg',
        status: 'monitored',
        hasFile: false,
        monitored: true,
        certification: 'PG-13',
        runtime: 166,
    };
    it('renders movie information', () => {
        render(_jsx(CalendarMovieEvent, { movie: mockMovie }));
        expect(screen.getByText('Dune: Part Two')).toBeInTheDocument();
        expect(screen.getByText('monitored')).toBeInTheDocument(); // StatusBadge normalizes to lowercase
        expect(screen.getByText('Cinema')).toBeInTheDocument();
        expect(screen.getByText('PG-13')).toBeInTheDocument();
        expect(screen.getByText('166m')).toBeInTheDocument();
    });
    it('renders poster when provided', () => {
        render(_jsx(CalendarMovieEvent, { movie: mockMovie }));
        const poster = screen.getByAltText('Dune: Part Two');
        expect(poster).toBeInTheDocument();
        expect(poster).toHaveAttribute('src', 'https://example.com/poster.jpg');
    });
    it('handles click event', async () => {
        const handleClick = vi.fn();
        render(_jsx(CalendarMovieEvent, { movie: mockMovie, onClick: handleClick }));
        const link = screen.getByRole('link');
        await userEvent.click(link);
        expect(handleClick).toHaveBeenCalledWith(mockMovie);
    });
    it('shows different release types', () => {
        const { rerender } = render(_jsx(CalendarMovieEvent, { movie: mockMovie }));
        expect(screen.getByText('Cinema')).toBeInTheDocument();
        const digitalMovie = { ...mockMovie, releaseType: 'digital' };
        rerender(_jsx(CalendarMovieEvent, { movie: digitalMovie }));
        expect(screen.getByText('Digital')).toBeInTheDocument();
        const physicalMovie = { ...mockMovie, releaseType: 'physical' };
        rerender(_jsx(CalendarMovieEvent, { movie: physicalMovie }));
        expect(screen.getByText('Physical')).toBeInTheDocument();
    });
    it('shows different statuses', () => {
        const { rerender } = render(_jsx(CalendarMovieEvent, { movie: mockMovie }));
        // Monitored (normalized to lowercase)
        expect(screen.getByText('monitored')).toBeInTheDocument();
        // Downloaded
        const downloadedMovie = { ...mockMovie, status: 'downloaded' };
        rerender(_jsx(CalendarMovieEvent, { movie: downloadedMovie }));
        expect(screen.getByText('downloaded')).toBeInTheDocument();
        // Missing
        const missingMovie = { ...mockMovie, status: 'missing' };
        rerender(_jsx(CalendarMovieEvent, { movie: missingMovie }));
        expect(screen.getByText('missing')).toBeInTheDocument();
        // Unmonitored
        const unmonitoredMovie = { ...mockMovie, status: 'unmonitored' };
        rerender(_jsx(CalendarMovieEvent, { movie: unmonitoredMovie }));
        expect(screen.getByText('unmonitored')).toBeInTheDocument();
    });
    it('does not render poster when not provided', () => {
        const movieWithoutPoster = { ...mockMovie, posterUrl: undefined };
        render(_jsx(CalendarMovieEvent, { movie: movieWithoutPoster }));
        expect(screen.queryByAltText('Dune: Part Two')).not.toBeInTheDocument();
    });
    it('omits optional fields when not provided', () => {
        const movieWithoutOptional = {
            ...mockMovie,
            certification: undefined,
            runtime: undefined,
        };
        render(_jsx(CalendarMovieEvent, { movie: movieWithoutOptional }));
        expect(screen.queryByText('PG-13')).not.toBeInTheDocument();
        expect(screen.queryByText('166m')).not.toBeInTheDocument();
    });
});
//# sourceMappingURL=CalendarMovieEvent.test.js.map