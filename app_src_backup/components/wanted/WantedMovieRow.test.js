import { jsx as _jsx } from "react/jsx-runtime";
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WantedMovieRow, getStatusLabel, getStatusBadgeColor } from './WantedMovieRow';
const mockOnSearch = vi.fn();
const mockOnEdit = vi.fn();
const mockOnDelete = vi.fn();
const mockOnToggleMonitored = vi.fn();
const mockOnSelect = vi.fn();
const mockMovie = {
    id: 1,
    movieId: 101,
    title: 'Dune: Part Two',
    year: 2024,
    posterUrl: 'https://image.tmdb.org/t/p/w200/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg',
    status: 'released',
    monitored: true,
    cinemaDate: '2024-03-01',
    digitalRelease: '2024-05-14',
    physicalRelease: '2024-06-18',
    qualityProfileId: 1,
    qualityProfileName: 'HD-1080p',
    runtime: 166,
    certification: 'PG-13',
    genres: ['Action', 'Adventure', 'Drama', 'Sci-Fi'],
};
describe('WantedMovieRow', () => {
    beforeEach(() => {
        mockOnSearch.mockClear();
        mockOnEdit.mockClear();
        mockOnDelete.mockClear();
        mockOnToggleMonitored.mockClear();
        mockOnSelect.mockClear();
    });
    it('renders movie information', () => {
        render(_jsx(WantedMovieRow, { movie: mockMovie, onSearch: mockOnSearch, onEdit: mockOnEdit, onDelete: mockOnDelete, onToggleMonitored: mockOnToggleMonitored, onSelect: mockOnSelect }));
        expect(screen.getByText('Dune: Part Two')).toBeInTheDocument();
        expect(screen.getByText('2024')).toBeInTheDocument();
        expect(screen.getByText('HD-1080p')).toBeInTheDocument();
        expect(screen.getByText('166 min')).toBeInTheDocument();
    });
    it('renders movie poster when available', () => {
        render(_jsx(WantedMovieRow, { movie: mockMovie, onSearch: mockOnSearch, onEdit: mockOnEdit, onDelete: mockOnDelete, onToggleMonitored: mockOnToggleMonitored, onSelect: mockOnSelect }));
        const poster = screen.getByAltText('Dune: Part Two');
        expect(poster).toBeInTheDocument();
        expect(poster).toHaveAttribute('src', mockMovie.posterUrl);
    });
    it('does not render poster when not available', () => {
        const movieWithoutPoster = { ...mockMovie, posterUrl: undefined };
        render(_jsx(WantedMovieRow, { movie: movieWithoutPoster, onSearch: mockOnSearch, onEdit: mockOnEdit, onDelete: mockOnDelete, onToggleMonitored: mockOnToggleMonitored, onSelect: mockOnSelect }));
        expect(screen.queryByAltText('Dune: Part Two')).not.toBeInTheDocument();
    });
    it('renders release dates', () => {
        render(_jsx(WantedMovieRow, { movie: mockMovie, onSearch: mockOnSearch, onEdit: mockOnEdit, onDelete: mockOnDelete, onToggleMonitored: mockOnToggleMonitored, onSelect: mockOnSelect }));
        expect(screen.getByText(/Cinema:/i)).toBeInTheDocument();
        expect(screen.getByText(/2024-03-01/)).toBeInTheDocument();
        expect(screen.getByText(/Digital:/i)).toBeInTheDocument();
        expect(screen.getByText(/2024-05-14/)).toBeInTheDocument();
        expect(screen.getByText(/Physical:/i)).toBeInTheDocument();
        expect(screen.getByText(/2024-06-18/)).toBeInTheDocument();
    });
    it('calls onSearch when Search button is clicked', () => {
        render(_jsx(WantedMovieRow, { movie: mockMovie, onSearch: mockOnSearch, onEdit: mockOnEdit, onDelete: mockOnDelete, onToggleMonitored: mockOnToggleMonitored, onSelect: mockOnSelect }));
        const searchButton = screen.getByRole('button', { name: 'Search' });
        fireEvent.click(searchButton);
        expect(mockOnSearch).toHaveBeenCalledTimes(1);
        expect(mockOnSearch).toHaveBeenCalledWith(mockMovie);
    });
    it('calls onEdit when Edit button is clicked', () => {
        render(_jsx(WantedMovieRow, { movie: mockMovie, onSearch: mockOnSearch, onEdit: mockOnEdit, onDelete: mockOnDelete, onToggleMonitored: mockOnToggleMonitored, onSelect: mockOnSelect }));
        const editButton = screen.getByRole('button', { name: 'Edit' });
        fireEvent.click(editButton);
        expect(mockOnEdit).toHaveBeenCalledTimes(1);
        expect(mockOnEdit).toHaveBeenCalledWith(mockMovie);
    });
    it('calls onDelete when Delete button is clicked', () => {
        render(_jsx(WantedMovieRow, { movie: mockMovie, onSearch: mockOnSearch, onEdit: mockOnEdit, onDelete: mockOnDelete, onToggleMonitored: mockOnToggleMonitored, onSelect: mockOnSelect }));
        const deleteButton = screen.getByRole('button', { name: 'Delete' });
        fireEvent.click(deleteButton);
        expect(mockOnDelete).toHaveBeenCalledTimes(1);
        expect(mockOnDelete).toHaveBeenCalledWith(mockMovie);
    });
    it('calls onToggleMonitored when Monitored button is clicked', () => {
        render(_jsx(WantedMovieRow, { movie: mockMovie, onSearch: mockOnSearch, onEdit: mockOnEdit, onDelete: mockOnDelete, onToggleMonitored: mockOnToggleMonitored, onSelect: mockOnSelect }));
        const monitoredButton = screen.getByRole('button', { name: 'Monitored' });
        fireEvent.click(monitoredButton);
        expect(mockOnToggleMonitored).toHaveBeenCalledTimes(1);
        expect(mockOnToggleMonitored).toHaveBeenCalledWith(101, false);
    });
    it('shows checkbox and calls onSelect when clicked', () => {
        render(_jsx(WantedMovieRow, { movie: mockMovie, onSearch: mockOnSearch, onEdit: mockOnEdit, onDelete: mockOnDelete, onToggleMonitored: mockOnToggleMonitored, onSelect: mockOnSelect, selected: false }));
        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).not.toBeChecked();
        fireEvent.click(checkbox);
        expect(mockOnSelect).toHaveBeenCalledTimes(1);
        expect(mockOnSelect).toHaveBeenCalledWith(1);
    });
    it('shows selected state', () => {
        render(_jsx(WantedMovieRow, { movie: mockMovie, onSearch: mockOnSearch, onEdit: mockOnEdit, onDelete: mockOnDelete, onToggleMonitored: mockOnToggleMonitored, onSelect: mockOnSelect, selected: true }));
        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).toBeChecked();
    });
    it('shows Unmonitored button for unmonitored movies', () => {
        const unmonitoredMovie = { ...mockMovie, monitored: false };
        render(_jsx(WantedMovieRow, { movie: unmonitoredMovie, onSearch: mockOnSearch, onEdit: mockOnEdit, onDelete: mockOnDelete, onToggleMonitored: mockOnToggleMonitored, onSelect: mockOnSelect }));
        expect(screen.getByRole('button', { name: 'Unmonitored' })).toBeInTheDocument();
    });
});
describe('getStatusLabel', () => {
    it('returns correct label for each status', () => {
        expect(getStatusLabel('missing')).toBe('Missing');
        expect(getStatusLabel('announced')).toBe('Announced');
        expect(getStatusLabel('incinemas')).toBe('In Cinemas');
        expect(getStatusLabel('released')).toBe('Released');
    });
});
describe('getStatusBadgeColor', () => {
    it('returns correct color for each status', () => {
        expect(getStatusBadgeColor('missing')).toBe('text-accent-danger');
        expect(getStatusBadgeColor('announced')).toBe('text-accent-info');
        expect(getStatusBadgeColor('incinemas')).toBe('text-accent-warning');
        expect(getStatusBadgeColor('released')).toBe('text-accent-success');
    });
});
//# sourceMappingURL=WantedMovieRow.test.js.map