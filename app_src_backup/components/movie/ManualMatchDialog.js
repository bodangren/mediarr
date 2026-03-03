'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/primitives/Button';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/primitives/Modal';
import { Icon } from '@/components/primitives/Icon';
import { getApiClients } from '@/lib/api/client';
export function ManualMatchDialog({ isOpen, onClose, originalTitle, originalYear, onSelect, }) {
    const { discoverApi } = useMemo(() => getApiClients(), []);
    const [searchQuery, setSearchQuery] = useState(originalTitle || '');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    // Search for movies
    const handleSearch = useCallback(async () => {
        if (!searchQuery.trim())
            return;
        setIsSearching(true);
        setHasSearched(true);
        try {
            // Use discover API to search for movies
            const response = await discoverApi.searchMovies({ query: searchQuery });
            setResults(response.results.map((m) => ({
                id: m.id || m.tmdbId,
                title: m.title,
                year: m.year || (m.releaseDate ? new Date(m.releaseDate).getFullYear() : undefined),
                overview: m.overview,
                posterUrl: m.posterUrl || m.posterPath,
                tmdbId: m.tmdbId || m.id,
                imdbId: m.imdbId,
            })));
        }
        catch (error) {
            console.error('Search failed:', error);
            setResults([]);
        }
        finally {
            setIsSearching(false);
        }
    }, [searchQuery, discoverApi]);
    // Initialize search with original title when dialog opens
    useMemo(() => {
        if (isOpen && originalTitle && !hasSearched) {
            setSearchQuery(originalTitle);
        }
    }, [isOpen, originalTitle, hasSearched]);
    // Reset state when dialog closes
    const handleClose = useCallback(() => {
        setResults([]);
        setHasSearched(false);
        onClose();
    }, [onClose]);
    // Handle movie selection
    const handleSelect = useCallback((movie) => {
        onSelect(movie);
        handleClose();
    }, [onSelect, handleClose]);
    return (_jsxs(Modal, { isOpen: isOpen, onClose: handleClose, ariaLabel: "Manual Match", maxWidthClassName: "max-w-2xl", children: [_jsx(ModalHeader, { title: "Manual Match", onClose: handleClose }), _jsx(ModalBody, { children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex gap-2", children: [_jsx("input", { type: "text", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), placeholder: "Search for a movie...", onKeyDown: (e) => e.key === 'Enter' && handleSearch(), className: "flex-1 rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm" }), _jsxs(Button, { variant: "primary", onClick: handleSearch, disabled: isSearching || !searchQuery.trim(), children: [isSearching ? (_jsx(Icon, { name: "refresh", className: "animate-spin" })) : (_jsx(Icon, { name: "search" })), _jsx("span", { children: "Search" })] })] }), originalTitle && (_jsxs("div", { className: "text-sm text-text-secondary", children: ["Original: ", _jsx("strong", { children: originalTitle }), originalYear && ` (${originalYear})`] })), _jsx("div", { className: "max-h-[400px] overflow-y-auto", children: isSearching ? (_jsxs("div", { className: "flex items-center justify-center py-8", children: [_jsx(Icon, { name: "refresh", className: "animate-spin text-2xl" }), _jsx("span", { className: "ml-2", children: "Searching..." })] })) : hasSearched && results.length === 0 ? (_jsx("div", { className: "text-center py-8 text-text-secondary", children: "No movies found. Try a different search term." })) : (_jsx("div", { className: "space-y-2", children: results.map((movie) => (_jsx("button", { type: "button", className: "w-full text-left p-3 rounded-lg border border-border-subtle hover:bg-surface-2 transition-colors", onClick: () => handleSelect(movie), children: _jsxs("div", { className: "flex items-start gap-3", children: [_jsx("div", { className: "w-12 h-18 shrink-0 bg-surface-2 rounded overflow-hidden", children: movie.posterUrl ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                _jsx("img", { src: movie.posterUrl, alt: movie.title, className: "w-full h-full object-cover" })) : (_jsx("div", { className: "w-full h-full flex items-center justify-center text-text-muted", children: _jsx(Icon, { name: "package" }) })) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "font-medium text-text-primary", children: [movie.title, movie.year && (_jsxs("span", { className: "text-text-secondary ml-2", children: ["(", movie.year, ")"] }))] }), movie.overview && (_jsx("p", { className: "text-sm text-text-secondary mt-1 line-clamp-2", children: movie.overview })), movie.tmdbId && (_jsxs("div", { className: "text-xs text-text-muted mt-1", children: ["TMDB: ", movie.tmdbId] }))] })] }) }, movie.id))) })) })] }) }), _jsx(ModalFooter, { children: _jsx(Button, { variant: "secondary", onClick: handleClose, children: "Cancel" }) })] }));
}
//# sourceMappingURL=ManualMatchDialog.js.map