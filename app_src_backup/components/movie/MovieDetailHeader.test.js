import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MovieDetailHeader } from './MovieDetailHeader';
const mockMovie = {
    id: 1,
    title: 'Inception',
    year: 2010,
    overview: 'A thief who steals corporate secrets...',
    runtime: 148,
    certification: 'PG-13',
    posterUrl: '/posters/inception.jpg',
    backdropUrl: '/backdrops/inception.jpg',
    status: 'downloaded',
    monitored: true,
    qualityProfileId: 1,
    qualityProfileName: 'HD - 1080p',
    sizeOnDisk: 4_294_967_296,
    path: '/Movies/Inception (2010)',
    genres: ['Action', 'Adventure', 'Sci-Fi'],
    studio: 'Warner Bros. Pictures',
    collection: 'Christopher Nolan Collection',
    ratings: {
        tmdb: 8.4,
        imdb: 8.8,
        rottenTomatoes: 87,
    },
    files: [],
    cast: [],
    crew: [],
    alternateTitles: [],
};
describe('MovieDetailHeader', () => {
    it('renders movie title and year', () => {
        render(_jsx(MovieDetailHeader, { movie: mockMovie, onMonitoredChange: vi.fn() }));
        expect(screen.getByText('Inception')).toBeInTheDocument();
        expect(screen.getByText('2010')).toBeInTheDocument();
    });
    it('renders monitored toggle button', () => {
        const handleMonitoredChange = vi.fn();
        render(_jsx(MovieDetailHeader, { movie: mockMovie, onMonitoredChange: handleMonitoredChange }));
        const toggleButton = screen.getByRole('button', { name: /Monitored/i });
        expect(toggleButton).toBeInTheDocument();
        fireEvent.click(toggleButton);
        expect(handleMonitoredChange).toHaveBeenCalledWith(false);
    });
    it('renders ratings badges', () => {
        render(_jsx(MovieDetailHeader, { movie: mockMovie, onMonitoredChange: vi.fn() }));
        expect(screen.getByText(/TMDB/i)).toBeInTheDocument();
        expect(screen.getByText(/8\.4/)).toBeInTheDocument();
        expect(screen.getByText(/IMDb/i)).toBeInTheDocument();
        expect(screen.getByText(/8\.8/)).toBeInTheDocument();
        expect(screen.getByText(/RT/i)).toBeInTheDocument();
        expect(screen.getByText(/87%/)).toBeInTheDocument();
    });
    it('renders size and collection information', () => {
        render(_jsx(MovieDetailHeader, { movie: mockMovie, onMonitoredChange: vi.fn() }));
        expect(screen.getByText(/4\.0 GB/)).toBeInTheDocument();
        expect(screen.getByText('Christopher Nolan Collection')).toBeInTheDocument();
    });
    it('does not render navigation buttons when handlers not provided', () => {
        render(_jsx(MovieDetailHeader, { movie: mockMovie, onMonitoredChange: vi.fn() }));
        expect(screen.queryAllByRole('button')).toHaveLength(2);
    });
    it('renders navigation buttons when handlers provided', () => {
        const handlePrevious = vi.fn();
        const handleNext = vi.fn();
        render(_jsx(MovieDetailHeader, { movie: mockMovie, onMonitoredChange: vi.fn(), onPreviousMovie: handlePrevious, onNextMovie: handleNext }));
        expect(screen.getAllByRole('button')).toHaveLength(4);
    });
});
//# sourceMappingURL=MovieDetailHeader.test.js.map