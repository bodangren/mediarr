'use client';
import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Download, AlertCircle, CheckCircle, Loader2, Filter, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { Modal, ModalBody, ModalHeader } from '@/components/primitives/Modal';
import { EmptyPanel } from '@/components/primitives/EmptyPanel';
import { SkeletonBlock } from '@/components/primitives/SkeletonBlock';
import { FilterMenu } from '@/components/primitives/FilterMenu';
import { getApiClients } from '@/lib/api/client';
import { useToast } from '@/components/providers/ToastProvider';
import { QualityBadge } from '@/components/search/QualityBadge';
import { ReleaseTitle } from '@/components/search/ReleaseTitle';
import { PeersCell } from '@/components/search/PeersCell';
import { AgeCell } from '@/components/search/AgeCell';
function formatSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`;
}
function formatScore(score) {
    if (score === undefined || score === null || score === 0) {
        return null;
    }
    const prefix = score > 0 ? '+' : '';
    return `${prefix}${score}`;
}
const qualityOptions = [
    { key: 'all', label: 'All Qualities' },
    { key: '2160p', label: '2160p (4K)' },
    { key: '1080p', label: '1080p' },
    { key: '720p', label: '720p' },
    { key: '480p', label: '480p' },
    { key: 'sd', label: 'SD' },
];
const sortOptions = [
    { key: 'seeders', label: 'Seeders' },
    { key: 'size', label: 'Size' },
    { key: 'age', label: 'Age' },
    { key: 'quality', label: 'Quality' },
];
export function MovieInteractiveSearchModal({ isOpen, onClose, movieId, movieTitle, movieYear, imdbId, tmdbId, }) {
    const [releases, setReleases] = useState([]);
    const [filteredReleases, setFilteredReleases] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchError, setSearchError] = useState(null);
    const [grabState, setGrabState] = useState({
        releaseId: null,
        isGrabbing: false,
        error: null,
        success: false,
    });
    const [qualityFilter, setQualityFilter] = useState('all');
    const [indexerFilter, setIndexerFilter] = useState('all');
    const [sortField, setSortField] = useState('seeders');
    const [sortDirection, setSortDirection] = useState('desc');
    const [overrideMatch, setOverrideMatch] = useState({
        isOpen: false,
        releaseId: null,
        title: '',
        year: '',
    });
    const [availableIndexers, setAvailableIndexers] = useState([
        { key: 'all', label: 'All Indexers' },
    ]);
    const api = useMemo(() => getApiClients(), []);
    const { pushToast } = useToast();
    const searchReleases = useCallback(async () => {
        setIsLoading(true);
        setSearchError(null);
        setGrabState({ releaseId: null, isGrabbing: false, error: null, success: false });
        try {
            // Build search parameters - use tmdbId or imdbId, not movieId
            const searchParams = {
                type: 'movie',
                title: movieTitle,
            };
            if (imdbId)
                searchParams.imdbId = imdbId;
            else if (tmdbId)
                searchParams.tmdbId = tmdbId;
            if (movieYear)
                searchParams.year = movieYear;
            const result = await api.releaseApi.searchCandidates(searchParams);
            // Transform API response to component's expected format
            // PaginatedResult has items property
            const releasesData = (result.items || []).map((candidate, index) => ({
                id: candidate.guid || `${candidate.indexer}-${index}`,
                guid: candidate.guid || `${candidate.indexer}-${index}`,
                indexer: candidate.indexer,
                indexerId: candidate.indexerId,
                title: candidate.title,
                quality: {
                    quality: {
                        name: candidate.quality || 'Unknown',
                        resolution: getResolutionFromQuality(candidate.quality || ''),
                    },
                    revision: { version: 1, real: 0 },
                },
                size: candidate.size,
                seeders: candidate.seeders,
                leechers: candidate.leechers || 0,
                publishDate: candidate.publishDate || new Date().toISOString(),
                ageHours: candidate.age || 0,
                approved: !candidate.indexerFlags || candidate.indexerFlags.length === 0,
                rejections: candidate.indexerFlags ? [candidate.indexerFlags] : [],
                customFormatScore: candidate.customFormatScore ?? 0,
                protocol: candidate.protocol,
            }));
            setReleases(releasesData);
            // Extract unique indexers for filter
            const uniqueIndexers = Array.from(new Set(releasesData.map(r => r.indexer)))
                .sort()
                .map(indexer => ({ key: indexer, label: indexer }));
            setAvailableIndexers([{ key: 'all', label: 'All Indexers' }, ...uniqueIndexers]);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to search for releases';
            setSearchError(errorMessage);
            pushToast({
                title: 'Search failed',
                message: errorMessage,
                variant: 'error',
            });
            setReleases([]);
        }
        finally {
            setIsLoading(false);
        }
    }, [movieId, movieTitle, movieYear, imdbId, tmdbId, api.releaseApi, pushToast]);
    // Filter and sort releases
    useEffect(() => {
        let filtered = [...releases];
        // Apply quality filter
        if (qualityFilter !== 'all') {
            filtered = filtered.filter(r => r.quality.quality.name.toLowerCase().includes(qualityFilter));
        }
        // Apply indexer filter
        if (indexerFilter !== 'all') {
            filtered = filtered.filter(r => r.indexer === indexerFilter);
        }
        // Apply sorting
        filtered.sort((a, b) => {
            let comparison = 0;
            switch (sortField) {
                case 'seeders':
                    comparison = (a.seeders || 0) - (b.seeders || 0);
                    break;
                case 'size':
                    comparison = a.size - b.size;
                    break;
                case 'age':
                    comparison = a.ageHours - b.ageHours;
                    break;
                case 'quality':
                    comparison = getQualityOrder(a.quality.quality.name) - getQualityOrder(b.quality.quality.name);
                    break;
                default:
                    comparison = 0;
            }
            return sortDirection === 'desc' ? -comparison : comparison;
        });
        setFilteredReleases(filtered);
    }, [releases, qualityFilter, indexerFilter, sortField, sortDirection]);
    // Search automatically when modal opens
    useEffect(() => {
        if (isOpen) {
            void searchReleases();
        }
    }, [isOpen, searchReleases]);
    const handleGrab = useCallback(async (release) => {
        setGrabState({ releaseId: release.id, isGrabbing: true, error: null, success: false });
        try {
            await api.releaseApi.grabRelease(release.guid, release.indexerId);
            setGrabState({ releaseId: release.id, isGrabbing: false, error: null, success: true });
            pushToast({
                title: 'Release grabbed successfully',
                message: `${release.title} has been added to your download queue.`,
                variant: 'success',
            });
            // Reset success state after 3 seconds
            setTimeout(() => {
                setGrabState(prev => ({ ...prev, success: false }));
            }, 3000);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to grab release';
            setGrabState({
                releaseId: release.id,
                isGrabbing: false,
                error: errorMessage,
                success: false,
            });
            pushToast({
                title: 'Failed to grab release',
                message: errorMessage,
                variant: 'error',
            });
        }
    }, [api.releaseApi, pushToast]);
    const handleOverrideMatch = useCallback((release) => {
        setOverrideMatch({
            isOpen: true,
            releaseId: release.id,
            title: movieTitle,
            year: movieYear ? String(movieYear) : '',
        });
    }, [movieTitle, movieYear]);
    const handleSaveOverride = useCallback(async () => {
        // This would typically call an API to save the override
        // For now, just close the modal and show a toast
        pushToast({
            title: 'Match override saved',
            message: `Release matched to "${overrideMatch.title} (${overrideMatch.year})"`,
            variant: 'success',
        });
        setOverrideMatch({ isOpen: false, releaseId: null, title: '', year: '' });
    }, [overrideMatch.title, overrideMatch.year, pushToast]);
    const handleClose = useCallback(() => {
        setReleases([]);
        setFilteredReleases([]);
        setSearchError(null);
        setGrabState({ releaseId: null, isGrabbing: false, error: null, success: false });
        setQualityFilter('all');
        setIndexerFilter('all');
        onClose();
    }, [onClose]);
    const headerTitle = (_jsxs("span", { children: ["Interactive Search - ", movieTitle, " ", movieYear && `(${movieYear})`] }));
    const headerActions = (_jsxs(Button, { variant: "primary", onClick: () => void searchReleases(), disabled: isLoading, className: "flex items-center gap-2", children: [_jsx(Search, { size: 16 }), isLoading ? 'Searching...' : 'Search'] }));
    return (_jsxs(_Fragment, { children: [_jsxs(Modal, { isOpen: isOpen, ariaLabel: `Interactive search for ${movieTitle}`, onClose: handleClose, maxWidthClassName: "max-w-4xl lg:max-w-6xl", children: [_jsx(ModalHeader, { title: headerTitle, onClose: handleClose, actions: headerActions }), _jsxs(ModalBody, { children: [searchError && (_jsx("div", { className: "mb-4 rounded-md border border-status-error/50 bg-status-error/10 p-3", children: _jsxs("div", { className: "flex items-center gap-2 text-status-error", children: [_jsx(AlertCircle, { size: 16 }), _jsx("span", { className: "text-sm", children: searchError })] }) })), !isLoading && releases.length > 0 && (_jsxs("div", { className: "mb-4 flex flex-wrap gap-4 rounded-md border border-border-subtle bg-surface-2 p-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Filter, { size: 16, className: "text-text-secondary" }), _jsx(FilterMenu, { label: "Quality", value: qualityFilter, options: qualityOptions, onChange: setQualityFilter })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Filter, { size: 16, className: "text-text-secondary" }), _jsx(FilterMenu, { label: "Indexer", value: indexerFilter, options: availableIndexers, onChange: setIndexerFilter })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(ArrowUpDown, { size: 16, className: "text-text-secondary" }), _jsx(FilterMenu, { label: "Sort By", value: sortField, options: sortOptions, onChange: (value) => setSortField(value) }), _jsx(Button, { variant: "secondary", onClick: () => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'), className: "px-2 py-1 text-xs", children: sortDirection === 'asc' ? '↑' : '↓' })] })] })), isLoading && (_jsx("div", { className: "space-y-3", children: [1, 2, 3].map(i => (_jsxs("div", { className: "flex gap-4 rounded-md border border-border-subtle p-3", children: [_jsx(SkeletonBlock, { className: "h-4 w-24" }), _jsx(SkeletonBlock, { className: "h-4 flex-1" }), _jsx(SkeletonBlock, { className: "h-4 w-20" }), _jsx(SkeletonBlock, { className: "h-4 w-16" }), _jsx(SkeletonBlock, { className: "h-4 w-20" })] }, i))) })), !isLoading && filteredReleases.length === 0 && !searchError && (_jsx(EmptyPanel, { title: releases.length === 0 ? 'No releases found' : 'No releases match your filters', body: releases.length === 0
                                    ? 'Try searching again or check your indexer configuration.'
                                    : 'Try adjusting your filters to see more results.' })), !isLoading && filteredReleases.length > 0 && (_jsx("div", { className: "overflow-x-auto rounded-md border border-border-subtle", children: _jsxs("table", { className: "min-w-full text-left text-sm", children: [_jsx("thead", { className: "bg-surface-2 text-text-secondary", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-2 font-semibold", children: "Source" }), _jsx("th", { className: "px-3 py-2 font-semibold", children: "Release Title" }), _jsx("th", { className: "px-3 py-2 font-semibold", children: "Quality" }), _jsx("th", { className: "px-3 py-2 font-semibold", children: "Size" }), _jsx("th", { className: "px-3 py-2 font-semibold hidden md:table-cell", children: "Peers" }), _jsx("th", { className: "px-3 py-2 font-semibold hidden lg:table-cell", children: "Age" }), _jsx("th", { className: "px-3 py-2 font-semibold hidden lg:table-cell", children: "Score" }), _jsx("th", { className: "px-3 py-2 font-semibold text-right", children: "Actions" })] }) }), _jsx("tbody", { className: "divide-y divide-border-subtle bg-surface-1", children: filteredReleases.map(release => {
                                                const isGrabbing = grabState.releaseId === release.id && grabState.isGrabbing;
                                                const grabSuccess = grabState.releaseId === release.id && grabState.success;
                                                const grabError = grabState.releaseId === release.id && grabState.error;
                                                const isApproved = release.approved && (!release.rejections || release.rejections.length === 0);
                                                return (_jsxs("tr", { className: !isApproved ? 'bg-status-error/5' : '', children: [_jsx("td", { className: "px-3 py-2 text-text-primary", children: _jsx("span", { className: "text-xs", children: release.indexer }) }), _jsxs("td", { className: "px-3 py-2 text-text-primary max-w-xs", children: [_jsx(ReleaseTitle, { title: release.title }), !isApproved && release.rejections && release.rejections.length > 0 && (_jsx("div", { className: "mt-1 space-y-0.5", children: release.rejections.map((rejection, idx) => (_jsx("p", { className: "text-xs text-status-error", children: rejection }, idx))) })), grabError && (_jsx("p", { className: "mt-1 text-xs text-status-error", children: grabError }))] }), _jsx("td", { className: "px-3 py-2", children: _jsx(QualityBadge, { quality: release.quality.quality }) }), _jsx("td", { className: "px-3 py-2 text-text-primary text-xs", children: formatSize(release.size) }), _jsx("td", { className: "px-3 py-2 hidden md:table-cell", children: _jsx(PeersCell, { seeders: release.seeders, leechers: release.leechers }) }), _jsx("td", { className: "px-3 py-2 hidden lg:table-cell", children: _jsx(AgeCell, { ageHours: release.ageHours, publishDate: release.publishDate }) }), _jsxs("td", { className: "px-3 py-2 hidden lg:table-cell", children: [formatScore(release.customFormatScore) && (_jsx("span", { className: `text-xs font-medium ${(release.customFormatScore ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`, children: formatScore(release.customFormatScore) })), !formatScore(release.customFormatScore) && (_jsx("span", { className: "text-xs text-text-secondary", children: "-" }))] }), _jsx("td", { className: "px-3 py-2 text-right", children: grabSuccess ? (_jsxs("div", { className: "inline-flex items-center gap-1 text-green-400", children: [_jsx(CheckCircle, { size: 16 }), _jsx("span", { className: "text-xs", children: "Grabbed" })] })) : (_jsxs("div", { className: "inline-flex gap-2", children: [overrideMatch.isOpen && overrideMatch.releaseId === release.id ? (_jsx(Button, { variant: "secondary", onClick: () => handleOverrideMatch(release), className: "text-xs", children: "Override" })) : null, _jsx(Button, { variant: isApproved ? 'primary' : 'secondary', onClick: () => void handleGrab(release), disabled: isGrabbing, className: "inline-flex items-center gap-1", children: isGrabbing ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { size: 14, className: "animate-spin" }), _jsx("span", { className: "hidden sm:inline", children: "Grabbing..." })] })) : (_jsxs(_Fragment, { children: [_jsx(Download, { size: 14 }), _jsx("span", { className: "hidden sm:inline", children: "Grab" })] })) })] })) })] }, release.id));
                                            }) })] }) })), !isLoading && releases.length > 0 && (_jsxs("div", { className: "mt-3 flex justify-between text-xs text-text-secondary", children: [_jsxs("span", { children: [filteredReleases.length, " of ", releases.length, " release", releases.length !== 1 ? 's' : '', " shown"] }), filteredReleases.length < releases.length && (_jsx("span", { children: "Filter applied - showing matching releases" }))] }))] })] }), overrideMatch.isOpen && (_jsxs(Modal, { isOpen: overrideMatch.isOpen, onClose: () => setOverrideMatch({ isOpen: false, releaseId: null, title: '', year: '' }), maxWidthClassName: "max-w-md", ariaLabel: "Override match for release", children: [_jsx(ModalHeader, { title: "Override Match", onClose: () => setOverrideMatch({ isOpen: false, releaseId: null, title: '', year: '' }) }), _jsx(ModalBody, { children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "mb-2 block text-sm font-medium text-text-primary", children: "Title" }), _jsx("input", { type: "text", value: overrideMatch.title, onChange: (e) => setOverrideMatch(prev => ({ ...prev, title: e.target.value })), className: "w-full rounded-md border border-border-subtle bg-surface-1 px-3 py-2 text-text-primary" })] }), _jsxs("div", { children: [_jsx("label", { className: "mb-2 block text-sm font-medium text-text-primary", children: "Year" }), _jsx("input", { type: "text", value: overrideMatch.year, onChange: (e) => setOverrideMatch(prev => ({ ...prev, year: e.target.value })), className: "w-full rounded-md border border-border-subtle bg-surface-1 px-3 py-2 text-text-primary" })] }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "secondary", onClick: () => setOverrideMatch({ isOpen: false, releaseId: null, title: '', year: '' }), children: "Cancel" }), _jsx(Button, { variant: "primary", onClick: handleSaveOverride, children: "Save Override" })] })] }) })] }))] }));
}
// Helper functions
function getResolutionFromQuality(quality) {
    if (quality.includes('2160') || quality.includes('4K'))
        return 2160;
    if (quality.includes('1080'))
        return 1080;
    if (quality.includes('720'))
        return 720;
    if (quality.includes('480'))
        return 480;
    return 0;
}
function getQualityOrder(quality) {
    const qualityLower = quality.toLowerCase();
    if (qualityLower.includes('2160') || qualityLower.includes('4k'))
        return 4;
    if (qualityLower.includes('1080'))
        return 3;
    if (qualityLower.includes('720'))
        return 2;
    if (qualityLower.includes('480'))
        return 1;
    return 0;
}
//# sourceMappingURL=MovieInteractiveSearchModal.js.map