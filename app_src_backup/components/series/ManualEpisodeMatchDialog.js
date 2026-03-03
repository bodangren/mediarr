'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from '@/components/primitives/Button';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/primitives/Modal';
import { Icon } from '@/components/primitives/Icon';
import { getApiClients } from '@/lib/api/client';
export function ManualEpisodeMatchDialog({ isOpen, onClose, originalSeriesTitle, originalSeasonNumber, originalEpisodeNumber, onSelect, }) {
    const { mediaApi, seriesApi } = useMemo(() => getApiClients(), []);
    const [searchQuery, setSearchQuery] = useState(originalSeriesTitle || '');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    // Selected series state
    const [selectedSeries, setSelectedSeries] = useState(null);
    const [selectedSeason, setSelectedSeason] = useState(null);
    const [selectedEpisode, setSelectedEpisode] = useState(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    // Reset state when dialog closes
    useEffect(() => {
        if (!isOpen) {
            setSearchResults([]);
            setHasSearched(false);
            setSelectedSeries(null);
            setSelectedSeason(null);
            setSelectedEpisode(null);
        }
        else if (originalSeriesTitle && !hasSearched) {
            setSearchQuery(originalSeriesTitle);
        }
    }, [isOpen, originalSeriesTitle, hasSearched]);
    // Search for series
    const handleSearch = useCallback(async () => {
        if (!searchQuery.trim())
            return;
        setIsSearching(true);
        setHasSearched(true);
        setSelectedSeries(null);
        setSelectedSeason(null);
        setSelectedEpisode(null);
        try {
            const response = await mediaApi.searchMetadata({ term: searchQuery, mediaType: 'TV' });
            // The search returns basic metadata, we need to get full details for each
            const results = await Promise.all(response.slice(0, 10).map(async (item) => {
                try {
                    const details = await seriesApi.getSeriesWithEpisodes(item.id);
                    return details;
                }
                catch {
                    return null;
                }
            }));
            setSearchResults(results.filter((r) => r !== null));
        }
        catch (error) {
            console.error('Search failed:', error);
            setSearchResults([]);
        }
        finally {
            setIsSearching(false);
        }
    }, [searchQuery, mediaApi, seriesApi]);
    // Select series
    const handleSelectSeries = useCallback((series) => {
        setSelectedSeries(series);
        setSelectedSeason(null);
        setSelectedEpisode(null);
        // Auto-select season if we have original season number
        if (originalSeasonNumber !== undefined) {
            const season = series.seasons.find(s => s.seasonNumber === originalSeasonNumber);
            if (season) {
                setSelectedSeason(season);
                // Auto-select episode if we have original episode number
                if (originalEpisodeNumber !== undefined) {
                    const episode = season.episodes.find(e => e.episodeNumber === originalEpisodeNumber);
                    if (episode) {
                        setSelectedEpisode(episode);
                    }
                }
            }
        }
    }, [originalSeasonNumber, originalEpisodeNumber]);
    // Handle confirm
    const handleConfirm = useCallback(() => {
        if (!selectedSeries || !selectedSeason || !selectedEpisode)
            return;
        onSelect({
            seriesId: selectedSeries.id,
            seasonId: selectedSeason.id,
            episodeId: selectedEpisode.id,
            seriesTitle: selectedSeries.title,
        });
        onClose();
    }, [selectedSeries, selectedSeason, selectedEpisode, onSelect, onClose]);
    const handleClose = useCallback(() => {
        setSearchResults([]);
        setHasSearched(false);
        onClose();
    }, [onClose]);
    const canConfirm = selectedSeries && selectedSeason && selectedEpisode;
    return (_jsxs(Modal, { isOpen: isOpen, onClose: handleClose, ariaLabel: "Manual Episode Match", maxWidthClassName: "max-w-3xl", children: [_jsx(ModalHeader, { title: "Manual Episode Match", onClose: handleClose }), _jsx(ModalBody, { children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex gap-2", children: [_jsx("input", { type: "text", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), placeholder: "Search for a series...", onKeyDown: (e) => e.key === 'Enter' && handleSearch(), className: "flex-1 rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm" }), _jsxs(Button, { variant: "primary", onClick: handleSearch, disabled: isSearching || !searchQuery.trim(), children: [isSearching ? (_jsx(Icon, { name: "refresh", className: "animate-spin" })) : (_jsx(Icon, { name: "search" })), _jsx("span", { children: "Search" })] })] }), originalSeriesTitle && (_jsxs("div", { className: "text-sm text-text-secondary", children: ["Original: ", _jsx("strong", { children: originalSeriesTitle }), originalSeasonNumber !== undefined && ` - S${String(originalSeasonNumber).padStart(2, '0')}`, originalEpisodeNumber !== undefined && `E${String(originalEpisodeNumber).padStart(2, '0')}`] })), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [_jsxs("div", { className: "border border-border-subtle rounded-md p-3 max-h-[400px] overflow-y-auto", children: [_jsx("h4", { className: "text-sm font-semibold mb-2", children: "Series" }), isSearching ? (_jsx("div", { className: "flex items-center justify-center py-4", children: _jsx(Icon, { name: "refresh", className: "animate-spin" }) })) : hasSearched && searchResults.length === 0 ? (_jsx("p", { className: "text-sm text-text-secondary", children: "No series found" })) : selectedSeries ? (_jsx("button", { type: "button", className: "w-full text-left p-2 rounded bg-accent-primary/20 text-sm", onClick: () => {
                                                setSelectedSeries(null);
                                                setSelectedSeason(null);
                                                setSelectedEpisode(null);
                                            }, children: selectedSeries.title })) : (_jsx("div", { className: "space-y-1", children: searchResults.map((series) => (_jsx("button", { type: "button", className: "w-full text-left p-2 rounded hover:bg-surface-2 text-sm transition-colors", onClick: () => handleSelectSeries(series), children: series.title }, series.id))) }))] }), _jsxs("div", { className: "border border-border-subtle rounded-md p-3 max-h-[400px] overflow-y-auto", children: [_jsx("h4", { className: "text-sm font-semibold mb-2", children: "Season" }), selectedSeries ? (_jsx("div", { className: "space-y-1", children: selectedSeries.seasons.map((season) => (_jsxs("button", { type: "button", className: `w-full text-left p-2 rounded text-sm transition-colors ${selectedSeason?.id === season.id
                                                    ? 'bg-accent-primary/20'
                                                    : 'hover:bg-surface-2'}`, onClick: () => {
                                                    setSelectedSeason(season);
                                                    setSelectedEpisode(null);
                                                }, children: ["Season ", season.seasonNumber] }, season.id))) })) : (_jsx("p", { className: "text-sm text-text-muted", children: "Select a series first" }))] }), _jsxs("div", { className: "border border-border-subtle rounded-md p-3 max-h-[400px] overflow-y-auto", children: [_jsx("h4", { className: "text-sm font-semibold mb-2", children: "Episode" }), selectedSeason ? (_jsx("div", { className: "space-y-1", children: selectedSeason.episodes.map((episode) => (_jsxs("button", { type: "button", className: `w-full text-left p-2 rounded text-sm transition-colors ${selectedEpisode?.id === episode.id
                                                    ? 'bg-accent-primary/20'
                                                    : 'hover:bg-surface-2'}`, onClick: () => setSelectedEpisode(episode), children: [_jsxs("span", { className: "text-text-secondary", children: ["E", String(episode.episodeNumber).padStart(2, '0')] }), ": ", episode.title] }, episode.id))) })) : (_jsx("p", { className: "text-sm text-text-muted", children: "Select a season first" }))] })] }), canConfirm && (_jsx("div", { className: "rounded-md border border-accent-primary/40 bg-accent-primary/10 p-3", children: _jsxs("p", { className: "text-sm", children: [_jsx("strong", { children: "Match:" }), " ", selectedSeries.title, " - S", String(selectedSeason.seasonNumber).padStart(2, '0'), "E", String(selectedEpisode.episodeNumber).padStart(2, '0'), " -", selectedEpisode.title] }) }))] }) }), _jsxs(ModalFooter, { children: [_jsx(Button, { variant: "secondary", onClick: handleClose, children: "Cancel" }), _jsx(Button, { variant: "primary", onClick: handleConfirm, disabled: !canConfirm, children: "Confirm Match" })] })] }));
}
//# sourceMappingURL=ManualEpisodeMatchDialog.js.map