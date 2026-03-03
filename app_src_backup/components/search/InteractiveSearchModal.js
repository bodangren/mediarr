'use client';
import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Download, AlertCircle, CheckCircle, Loader2, Globe, Share2 } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { Modal, ModalBody, ModalHeader } from '@/components/primitives/Modal';
import { EmptyPanel } from '@/components/primitives/EmptyPanel';
import { SkeletonBlock } from '@/components/primitives/SkeletonBlock';
import { getApiClients } from '@/lib/api/client';
import { useToast } from '@/components/providers/ToastProvider';
import { QualityBadge } from './QualityBadge';
import { ReleaseTitle } from './ReleaseTitle';
import { PeersCell } from './PeersCell';
import { AgeCell } from './AgeCell';
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
export function InteractiveSearchModal({ isOpen, onClose, seriesId, tvdbId, episodeId, seriesTitle, seasonNumber, episodeNumber, episodeTitle, }) {
    const [releases, setReleases] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchError, setSearchError] = useState(null);
    const [grabState, setGrabState] = useState({
        releaseId: null,
        isGrabbing: false,
        error: null,
        success: false,
    });
    const api = useMemo(() => getApiClients(), []);
    const { pushToast } = useToast();
    const searchReleases = useCallback(async () => {
        setIsLoading(true);
        setSearchError(null);
        setGrabState({ releaseId: null, isGrabbing: false, error: null, success: false });
        try {
            // Build search params based on whether it's episode-level or season-level search
            const searchParams = {
                type: 'tvsearch',
            };
            if (tvdbId !== undefined) {
                searchParams.tvdbId = tvdbId;
            }
            if (seasonNumber !== undefined) {
                searchParams.season = seasonNumber;
            }
            if (episodeNumber !== undefined) {
                searchParams.episode = episodeNumber;
            }
            const result = await api.releaseApi.searchCandidates(searchParams);
            // Transform API response to component's expected format
            const releases = result.items.map((candidate, index) => ({
                id: candidate.guid || candidate.title + index, // Generate unique ID from guid or title + index
                guid: candidate.guid || candidate.title + '-guid',
                title: candidate.title,
                indexer: candidate.indexer,
                indexerId: candidate.indexerId,
                quality: {
                    quality: {
                        name: candidate.quality || 'Unknown',
                        resolution: 0, // API doesn't provide resolution directly
                    },
                    revision: { version: 1, real: 0 },
                },
                size: candidate.size,
                seeders: candidate.seeders,
                leechers: candidate.leechers || 0,
                publishDate: candidate.publishDate || new Date(Date.now() - (candidate.age || 0) * 60 * 60 * 1000).toISOString(),
                ageHours: candidate.age || 0,
                approved: !candidate.indexerFlags || candidate.indexerFlags.length === 0,
                rejections: candidate.indexerFlags ? [candidate.indexerFlags] : [],
                customFormatScore: candidate.customFormatScore ?? 0,
                protocol: candidate.protocol,
            }));
            setReleases(releases);
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
    }, [tvdbId, seasonNumber, episodeNumber, api.releaseApi, pushToast]);
    // Search automatically when modal opens
    useEffect(() => {
        if (isOpen) {
            void searchReleases();
        }
    }, [isOpen, searchReleases]);
    const handleGrab = useCallback(async (release) => {
        setGrabState({ releaseId: release.id, isGrabbing: true, error: null, success: false });
        try {
            // Use grabRelease with guid and indexerId
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
    const handleClose = useCallback(() => {
        setReleases([]);
        setSearchError(null);
        setGrabState({ releaseId: null, isGrabbing: false, error: null, success: false });
        onClose();
    }, [onClose]);
    const headerTitle = (_jsxs("span", { children: ["Interactive Search - ", seriesTitle, " S", seasonNumber.toString().padStart(2, '0'), episodeNumber !== undefined ? `E${episodeNumber.toString().padStart(2, '0')}` : ' (All Episodes)'] }));
    const headerActions = (_jsxs(Button, { variant: "primary", onClick: () => void searchReleases(), disabled: isLoading, className: "flex items-center gap-2", children: [_jsx(Search, { size: 16 }), isLoading ? 'Searching...' : 'Search'] }));
    return (_jsxs(Modal, { isOpen: isOpen, ariaLabel: `Interactive search for ${seriesTitle} S${seasonNumber}${episodeNumber !== undefined ? `E${episodeNumber}` : ' (All Episodes)'}`, onClose: handleClose, maxWidthClassName: "max-w-4xl lg:max-w-6xl", children: [_jsx(ModalHeader, { title: headerTitle, onClose: handleClose, actions: headerActions }), _jsxs(ModalBody, { children: [episodeTitle && (_jsx("div", { className: "mb-3", children: _jsxs("p", { className: "text-sm text-text-secondary", children: ["Episode: ", episodeTitle] }) })), searchError && (_jsx("div", { className: "mb-4 rounded-md border border-status-error/50 bg-status-error/10 p-3", children: _jsxs("div", { className: "flex items-center gap-2 text-status-error", children: [_jsx(AlertCircle, { size: 16 }), _jsx("span", { className: "text-sm", children: searchError })] }) })), isLoading && (_jsx("div", { className: "space-y-3", children: [1, 2, 3].map(i => (_jsxs("div", { className: "flex gap-4 rounded-md border border-border-subtle p-3", children: [_jsx(SkeletonBlock, { className: "h-4 w-24" }), _jsx(SkeletonBlock, { className: "h-4 flex-1" }), _jsx(SkeletonBlock, { className: "h-4 w-20" }), _jsx(SkeletonBlock, { className: "h-4 w-16" }), _jsx(SkeletonBlock, { className: "h-4 w-20" })] }, i))) })), !isLoading && releases.length === 0 && !searchError && (_jsx(EmptyPanel, { title: "No releases found", body: "Try searching again or check your indexer configuration." })), !isLoading && releases.length > 0 && (_jsx("div", { className: "overflow-x-auto rounded-md border border-border-subtle", children: _jsxs("table", { className: "min-w-full text-left text-sm", children: [_jsx("thead", { className: "bg-surface-2 text-text-secondary", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-2 font-semibold hidden sm:table-cell", children: "Protocol" }), _jsx("th", { className: "px-3 py-2 font-semibold", children: "Source" }), _jsx("th", { className: "px-3 py-2 font-semibold", children: "Release Title" }), _jsx("th", { className: "px-3 py-2 font-semibold", children: "Quality" }), _jsx("th", { className: "px-3 py-2 font-semibold", children: "Size" }), _jsx("th", { className: "px-3 py-2 font-semibold hidden md:table-cell", children: "Peers" }), _jsx("th", { className: "px-3 py-2 font-semibold hidden lg:table-cell", children: "Age" }), _jsx("th", { className: "px-3 py-2 font-semibold hidden lg:table-cell", children: "Score" }), _jsx("th", { className: "px-3 py-2 font-semibold text-right", children: "Actions" })] }) }), _jsx("tbody", { className: "divide-y divide-border-subtle bg-surface-1", children: releases.map(release => {
                                        const isGrabbing = grabState.releaseId === release.id && grabState.isGrabbing;
                                        const grabSuccess = grabState.releaseId === release.id && grabState.success;
                                        const grabError = grabState.releaseId === release.id && grabState.error;
                                        const isApproved = release.approved && (!release.rejections || release.rejections.length === 0);
                                        return (_jsxs("tr", { className: !isApproved ? 'bg-status-error/5' : '', children: [_jsx("td", { className: "px-3 py-2 hidden sm:table-cell", children: release.protocol === 'torrent' ? (_jsx(Share2, { size: 14, className: "text-text-secondary", "aria-label": "Torrent" })) : release.protocol === 'usenet' ? (_jsx(Globe, { size: 14, className: "text-text-secondary", "aria-label": "Usenet" })) : (_jsx("span", { className: "text-xs text-text-secondary", children: "-" })) }), _jsx("td", { className: "px-3 py-2 text-text-primary", children: _jsx("span", { className: "text-xs", children: release.indexer }) }), _jsxs("td", { className: "px-3 py-2 text-text-primary max-w-xs", children: [_jsx(ReleaseTitle, { title: release.title }), !isApproved && release.rejections && release.rejections.length > 0 && (_jsx("div", { className: "mt-1 space-y-0.5", children: release.rejections.map((rejection, idx) => (_jsx("p", { className: "text-xs text-status-error", children: rejection }, idx))) })), grabError && (_jsx("p", { className: "mt-1 text-xs text-status-error", children: grabError }))] }), _jsx("td", { className: "px-3 py-2", children: _jsx(QualityBadge, { quality: release.quality.quality }) }), _jsx("td", { className: "px-3 py-2 text-text-primary text-xs", children: formatSize(release.size) }), _jsx("td", { className: "px-3 py-2 hidden md:table-cell", children: _jsx(PeersCell, { seeders: release.seeders, leechers: release.leechers }) }), _jsx("td", { className: "px-3 py-2 hidden lg:table-cell", children: _jsx(AgeCell, { ageHours: release.ageHours, publishDate: release.publishDate }) }), _jsxs("td", { className: "px-3 py-2 hidden lg:table-cell", children: [formatScore(release.customFormatScore) && (_jsx("span", { className: `text-xs font-medium ${(release.customFormatScore ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`, children: formatScore(release.customFormatScore) })), !formatScore(release.customFormatScore) && (_jsx("span", { className: "text-xs text-text-secondary", children: "-" }))] }), _jsx("td", { className: "px-3 py-2 text-right", children: grabSuccess ? (_jsxs("div", { className: "inline-flex items-center gap-1 text-green-400", children: [_jsx(CheckCircle, { size: 16 }), _jsx("span", { className: "text-xs", children: "Grabbed" })] })) : (_jsx(Button, { variant: isApproved ? 'primary' : 'secondary', onClick: () => void handleGrab(release), disabled: isGrabbing || !isApproved, className: "inline-flex items-center gap-1", children: isGrabbing ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { size: 14, className: "animate-spin" }), _jsx("span", { className: "hidden sm:inline", children: "Grabbing..." })] })) : (_jsxs(_Fragment, { children: [_jsx(Download, { size: 14 }), _jsx("span", { className: "hidden sm:inline", children: "Grab" })] })) })) })] }, release.id));
                                    }) })] }) })), !isLoading && releases.length > 0 && (_jsxs("p", { className: "mt-3 text-xs text-text-secondary", children: [releases.length, " release", releases.length !== 1 ? 's' : '', " found"] }))] })] }));
}
//# sourceMappingURL=InteractiveSearchModal.js.map