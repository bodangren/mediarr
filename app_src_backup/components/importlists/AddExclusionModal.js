'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback } from 'react';
import { Button } from '@/components/primitives/Button';
import { Alert } from '@/components/primitives/Alert';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/primitives/Modal';
import { getApiClients } from '@/lib/api/client';
export function AddExclusionModal({ isOpen, onClose, onAdd, existingExclusions, isLoading = false, }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState(null);
    const [selectedResult, setSelectedResult] = useState(null);
    const handleSearch = useCallback(async () => {
        if (!searchQuery.trim())
            return;
        setIsSearching(true);
        setSearchError(null);
        setSearchResults([]);
        try {
            // Search movies using discover API
            const movieResults = await getApiClients().discoverApi.searchMovies({ query: searchQuery.trim() });
            // Transform to our format
            const results = movieResults.results.map((movie) => ({
                id: movie.tmdbId,
                title: movie.title,
                year: movie.year,
                overview: movie.overview,
                posterUrl: movie.posterUrl,
                mediaType: 'movie',
            }));
            setSearchResults(results);
        }
        catch (error) {
            setSearchError('Failed to search. Please try again.');
            console.error('Search error:', error);
        }
        finally {
            setIsSearching(false);
        }
    }, [searchQuery]);
    const handleAddExclusion = async () => {
        if (!selectedResult)
            return;
        await onAdd({
            tmdbId: selectedResult.id,
            title: `${selectedResult.title} (${selectedResult.year})`,
        });
        // Reset state
        setSearchQuery('');
        setSearchResults([]);
        setSelectedResult(null);
    };
    const isExcluded = (result) => {
        return existingExclusions.some((ex) => ex.tmdbId === result.id);
    };
    const handleClose = () => {
        setSearchQuery('');
        setSearchResults([]);
        setSelectedResult(null);
        setSearchError(null);
        onClose();
    };
    return (_jsxs(Modal, { isOpen: isOpen, ariaLabel: "Add Exclusion", onClose: handleClose, maxWidthClassName: "max-w-2xl", children: [_jsx(ModalHeader, { title: "Add Exclusion", onClose: handleClose }), _jsx(ModalBody, { children: _jsxs("div", { className: "space-y-4", children: [_jsx("p", { className: "text-sm text-text-secondary", children: "Search for a movie or TV series to exclude from automatic import." }), _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { type: "text", className: "flex-1 rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm outline-none focus:border-accent-primary", placeholder: "Search for a movie or TV series...", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), onKeyDown: (e) => e.key === 'Enter' && handleSearch() }), _jsx(Button, { variant: "primary", onClick: handleSearch, disabled: isSearching || !searchQuery.trim(), children: isSearching ? 'Searching...' : 'Search' })] }), searchError && (_jsx(Alert, { variant: "danger", children: _jsx("p", { children: searchError }) })), searchResults.length > 0 && (_jsxs("div", { className: "space-y-2", children: [_jsx("h4", { className: "text-sm font-medium text-text-primary", children: "Search Results" }), _jsx("div", { className: "max-h-64 overflow-y-auto space-y-2 rounded-sm border border-border-subtle", children: searchResults.map((result) => {
                                        const excluded = isExcluded(result);
                                        const isSelected = selectedResult?.id === result.id;
                                        return (_jsxs("button", { type: "button", className: `w-full text-left p-3 flex gap-3 hover:bg-surface-1 transition ${isSelected ? 'bg-accent-primary/10 border-l-2 border-accent-primary' : ''} ${excluded ? 'opacity-50' : ''}`, onClick: () => !excluded && setSelectedResult(result), disabled: excluded, children: [result.posterUrl ? (_jsx("img", { src: result.posterUrl, alt: result.title, className: "w-12 h-16 object-cover rounded-sm" })) : (_jsx("div", { className: "w-12 h-16 bg-surface-2 rounded-sm flex items-center justify-center", children: _jsx("span", { className: "text-xs text-text-muted", children: "No Image" }) })), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "font-medium text-text-primary truncate", children: result.title }), _jsxs("span", { className: "text-xs text-text-muted", children: ["(", result.year, ")"] }), _jsx("span", { className: "text-xs px-1.5 py-0.5 rounded bg-surface-2 text-text-muted capitalize", children: result.mediaType }), excluded && (_jsx("span", { className: "text-xs px-1.5 py-0.5 rounded bg-status-warning/15 text-status-warning", children: "Excluded" }))] }), result.overview && (_jsx("p", { className: "text-xs text-text-secondary line-clamp-2 mt-1", children: result.overview }))] })] }, `${result.mediaType}-${result.id}`));
                                    }) })] })), searchQuery && !isSearching && searchResults.length === 0 && !searchError && (_jsxs("p", { className: "text-sm text-text-muted text-center py-4", children: ["No results found for \u201C", searchQuery, "\u201D"] })), selectedResult && (_jsxs("div", { className: "rounded-sm border border-accent-primary bg-accent-primary/5 p-3", children: [_jsx("h4", { className: "text-sm font-medium text-text-primary mb-2", children: "Selected for Exclusion:" }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "font-medium", children: selectedResult.title }), _jsxs("span", { className: "text-sm text-text-muted", children: ["(", selectedResult.year, ")"] }), _jsx("span", { className: "text-xs px-1.5 py-0.5 rounded bg-surface-2 text-text-muted capitalize", children: selectedResult.mediaType })] }), _jsxs("p", { className: "text-xs text-text-muted mt-2", children: ["TMDB ID: ", selectedResult.id] })] }))] }) }), _jsxs(ModalFooter, { children: [_jsx(Button, { variant: "secondary", onClick: handleClose, disabled: isLoading, children: "Cancel" }), _jsx(Button, { variant: "primary", onClick: handleAddExclusion, disabled: !selectedResult || isLoading, children: isLoading ? 'Adding...' : 'Add Exclusion' })] })] }));
}
//# sourceMappingURL=AddExclusionModal.js.map