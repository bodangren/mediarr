'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { DataTable } from '@/components/primitives/DataTable';
import { FilterBuilder } from '@/components/primitives/FilterBuilder';
import { Label } from '@/components/primitives/Label';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/primitives/Modal';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { SelectFooter } from '@/components/primitives/SelectFooter';
import { SelectProvider, useSelectContext } from '@/components/primitives/SelectProvider';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
function SelectionCheckbox({ rowId }) {
    const { isSelected, toggleRow } = useSelectContext();
    return (_jsx("input", { type: "checkbox", "aria-label": "Select row", checked: isSelected(rowId), onChange: event => {
            toggleRow(rowId, event.nativeEvent.shiftKey);
        } }));
}
function parseOptionalNumber(value) {
    if (value.trim().length === 0) {
        return undefined;
    }
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
}
function parseRequiredNumber(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}
function inferProtocol(row) {
    if (row.protocol) {
        return row.protocol;
    }
    if (row.magnetUrl) {
        return 'torrent';
    }
    if (row.downloadUrl) {
        return 'usenet';
    }
    return 'unknown';
}
function formatGiB(size) {
    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
function parseIndexerFlags(flags) {
    if (!flags) {
        return [];
    }
    return flags
        .split(',')
        .map(flag => flag.trim().toLowerCase())
        .filter(Boolean);
}
function buildReleaseRowId(row) {
    return [
        row.indexer,
        row.indexerId,
        row.title,
        row.size,
        row.seeders,
        row.guid ?? '',
        row.magnetUrl ?? '',
        row.downloadUrl ?? '',
    ].join('|');
}
function toReleasePayload(row) {
    return {
        indexer: row.indexer,
        indexerId: row.indexerId,
        guid: row.guid,
        title: row.title,
        size: row.size,
        seeders: row.seeders,
        leechers: row.leechers,
        indexerFlags: row.indexerFlags,
        quality: row.quality,
        age: row.age,
        publishDate: row.publishDate,
        categories: row.categories,
        language: row.language,
        protocol: row.protocol,
        magnetUrl: row.magnetUrl,
        downloadUrl: row.downloadUrl,
        infoHash: row.infoHash,
    };
}
function customFilterValue(row, field) {
    switch (field) {
        case 'title':
            return row.title;
        case 'indexer':
            return row.indexer;
        case 'protocol':
            return row.protocol ?? inferProtocol(row);
        case 'seeders':
            return row.seeders;
        case 'size':
            return row.size / (1024 * 1024 * 1024);
        default:
            return '';
    }
}
function matchesCustomFilters(row, filter) {
    if (!filter || filter.conditions.length === 0) {
        return true;
    }
    const checks = filter.conditions.map(condition => {
        const value = customFilterValue(row, condition.field);
        const conditionValue = condition.value.trim();
        if (condition.operator === 'contains') {
            return String(value).toLowerCase().includes(conditionValue.toLowerCase());
        }
        if (condition.operator === 'equals') {
            return String(value).toLowerCase() === conditionValue.toLowerCase();
        }
        const numericValue = Number(value);
        const numericCondition = Number(conditionValue);
        if (!Number.isFinite(numericValue) || !Number.isFinite(numericCondition)) {
            return false;
        }
        return numericValue > numericCondition;
    });
    return filter.operator === 'and' ? checks.every(Boolean) : checks.some(Boolean);
}
function buildPayload(form, pagination, sortBy, sortDir) {
    const payload = {};
    if (form.query.trim().length > 0) {
        payload.query = form.query.trim();
    }
    if (form.searchType !== 'search') {
        payload.type = form.searchType;
    }
    if (form.category.trim().length > 0) {
        const categoryNums = form.category.split(',')
            .map(s => s.trim())
            .filter(Boolean)
            .map(s => Number.parseInt(s, 10))
            .filter(n => Number.isFinite(n));
        if (categoryNums.length > 0) {
            payload.categories = categoryNums;
        }
    }
    if (form.searchType === 'tvsearch') {
        const season = parseOptionalNumber(form.season);
        if (season !== undefined) {
            payload.season = season;
        }
        const episode = parseOptionalNumber(form.episode);
        if (episode !== undefined) {
            payload.episode = episode;
        }
        const tvdbId = parseOptionalNumber(form.tvdbId);
        if (tvdbId !== undefined) {
            payload.tvdbId = tvdbId;
        }
    }
    if (form.searchType === 'movie') {
        const imdbId = form.imdbId.trim();
        if (imdbId.length > 0) {
            payload.imdbId = imdbId;
        }
        const year = parseOptionalNumber(form.year);
        if (year !== undefined) {
            payload.year = year;
        }
    }
    if (form.searchType === 'music') {
        const artist = form.artist.trim();
        if (artist.length > 0) {
            payload.artist = artist;
        }
        const album = form.album.trim();
        if (album.length > 0) {
            payload.album = album;
        }
    }
    if (form.searchType === 'book') {
        const author = form.author.trim();
        if (author.length > 0) {
            payload.author = author;
        }
        const bookTitle = form.bookTitle.trim();
        if (bookTitle.length > 0) {
            payload.title = bookTitle;
        }
    }
    payload.page = pagination.page;
    payload.pageSize = pagination.pageSize;
    payload.sortBy = sortBy;
    payload.sortDir = sortDir;
    return payload;
}
export default function SearchPage() {
    const api = useMemo(() => getApiClients(), []);
    const [isQueryModalOpen, setIsQueryModalOpen] = useState(false);
    const [submittedParams, setSubmittedParams] = useState(null);
    const [actionNotice, setActionNotice] = useState(null);
    const [overrideTarget, setOverrideTarget] = useState(null);
    const [overrideTitle, setOverrideTitle] = useState('');
    const [overrideCategory, setOverrideCategory] = useState('');
    const [overrideQuality, setOverrideQuality] = useState('');
    const [overrideLanguage, setOverrideLanguage] = useState('');
    const [overridesByRowId, setOverridesByRowId] = useState({});
    const [protocolFilter, setProtocolFilter] = useState('all');
    const [indexerFilter, setIndexerFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [qualityFilter, setQualityFilter] = useState('all');
    const [minSizeGbFilter, setMinSizeGbFilter] = useState('');
    const [minSeedersFilter, setMinSeedersFilter] = useState('');
    const [downloadClientId, setDownloadClientId] = useState('');
    const [showCustomFilters, setShowCustomFilters] = useState(false);
    const [customFilter, setCustomFilter] = useState(null);
    const [pagination, setPagination] = useState({ page: 1, pageSize: 100 });
    const [sortBy, setSortBy] = useState('seeders');
    const [sortDir, setSortDir] = useState('desc');
    const [form, setForm] = useState({
        query: '',
        searchType: 'search',
        category: '',
        indexerId: '',
        limit: '100',
        offset: '0',
        season: '',
        episode: '',
        tvdbId: '',
        imdbId: '',
        year: '',
        artist: '',
        album: '',
        author: '',
        bookTitle: '',
    });
    const [queryDraft, setQueryDraft] = useState({
        season: '',
        episode: '',
        tvdbId: '',
        imdbId: '',
        year: '',
        artist: '',
        album: '',
        author: '',
        bookTitle: '',
    });
    const indexersQuery = useApiQuery({
        queryKey: queryKeys.indexers(),
        queryFn: () => api.indexerApi.list(),
        staleTimeKind: 'list',
        isEmpty: rows => rows.length === 0,
    });
    const downloadClientsQuery = useApiQuery({
        queryKey: queryKeys.downloadClients(),
        queryFn: () => api.downloadClientApi.list(),
        staleTimeKind: 'list',
    });
    const releasesQuery = useApiQuery({
        queryKey: queryKeys.releaseCandidates(submittedParams ?? { idle: true }),
        queryFn: () => api.releaseApi.searchCandidates(submittedParams || { query: '' }),
        enabled: Boolean(submittedParams),
        staleTimeKind: 'list',
        isEmpty: result => result?.items?.length === 0 || false,
    });
    const grabMutation = useMutation({
        mutationFn: async ({ candidate, downloadClientId }) => {
            const guid = candidate.guid ?? candidate.infoHash;
            if (!guid) {
                throw new Error('Release GUID is required');
            }
            return api.releaseApi.grabRelease(guid, candidate.indexerId, downloadClientId);
        },
    });
    const releaseRows = useMemo(() => (releasesQuery.data?.items ?? []).map((row) => {
        const rowId = buildReleaseRowId(row);
        const override = overridesByRowId[rowId];
        return {
            ...row,
            rowId,
            title: override?.title ?? row.title,
            categories: override?.categories ?? row.categories,
            quality: override?.quality ?? row.quality,
            language: override?.language ?? row.language,
        };
    }), [overridesByRowId, releasesQuery.data]);
    const filteredReleaseRows = useMemo(() => {
        const minSizeGb = Number.parseFloat(minSizeGbFilter);
        const minSeeders = Number.parseInt(minSeedersFilter, 10);
        const selectedCategory = categoryFilter === 'all' ? undefined : Number.parseInt(categoryFilter, 10);
        return releaseRows.filter(row => {
            const protocol = inferProtocol(row);
            if (protocolFilter !== 'all' && protocol !== protocolFilter) {
                return false;
            }
            if (indexerFilter !== 'all' && row.indexer !== indexerFilter) {
                return false;
            }
            if (selectedCategory !== undefined &&
                (!Number.isFinite(selectedCategory) || !row.categories?.includes(selectedCategory))) {
                return false;
            }
            const rowQuality = row.quality?.trim() || 'unknown';
            if (qualityFilter !== 'all' && rowQuality !== qualityFilter) {
                return false;
            }
            if (Number.isFinite(minSizeGb) && minSizeGb > 0) {
                const rowSizeGb = row.size / (1024 * 1024 * 1024);
                if (rowSizeGb < minSizeGb) {
                    return false;
                }
            }
            if (Number.isFinite(minSeeders) && minSeeders > 0 && row.seeders < minSeeders) {
                return false;
            }
            return matchesCustomFilters(row, customFilter);
        });
    }, [
        categoryFilter,
        customFilter,
        indexerFilter,
        minSeedersFilter,
        minSizeGbFilter,
        protocolFilter,
        qualityFilter,
        releaseRows,
    ]);
    const availableIndexerFilters = useMemo(() => Array.from(new Set(releaseRows.map(row => row.indexer))).sort((a, b) => a.localeCompare(b)), [releaseRows]);
    const availableCategoryFilters = useMemo(() => Array.from(new Set(releaseRows.flatMap(row => row.categories ?? []))).sort((a, b) => a - b), [releaseRows]);
    const availableQualityFilters = useMemo(() => Array.from(new Set(releaseRows.map(row => row.quality?.trim() || 'unknown'))).sort((a, b) => a.localeCompare(b)), [releaseRows]);
    const releaseById = useMemo(() => new Map(filteredReleaseRows.map(row => [row.rowId, row])), [filteredReleaseRows]);
    const columns = [
        {
            key: 'select',
            header: 'Select',
            render: row => _jsx(SelectionCheckbox, { rowId: row.rowId }),
        },
        {
            key: 'protocol',
            header: 'Protocol',
            render: row => row.protocol ?? inferProtocol(row),
        },
        {
            key: 'age',
            header: 'Age',
            render: row => `${row.age ?? '-'} d`,
        },
        {
            key: 'title',
            header: 'Title',
            render: row => row.title,
        },
        {
            key: 'indexer',
            header: 'Indexer',
            render: row => row.indexer,
        },
        {
            key: 'category',
            header: 'Category',
            render: row => {
                if (!row.categories || row.categories.length === 0) {
                    return '-';
                }
                return row.categories.join(', ');
            },
        },
        {
            key: 'flags',
            header: 'Flags',
            render: row => {
                const flags = parseIndexerFlags(row.indexerFlags);
                if (flags.length === 0) {
                    return '-';
                }
                return (_jsx("div", { className: "flex flex-wrap gap-1", children: flags.map(flag => (_jsx(Label, { children: flag }, `${row.rowId}-${flag}`))) }));
            },
        },
        {
            key: 'size',
            header: 'Size',
            render: row => formatGiB(row.size),
        },
        {
            key: 'seeders',
            header: 'Seeders/Peers',
            render: row => {
                const leechers = row.leechers ?? 0;
                return `${row.seeders}/${leechers}`;
            },
        },
    ];
    const handleGrab = async (candidate) => {
        const selectedDownloadClientId = parseOptionalNumber(downloadClientId);
        const override = overridesByRowId[candidate.rowId];
        try {
            if (override) {
                await api.releaseApi.grabCandidate({
                    ...toReleasePayload(candidate),
                    language: candidate.language,
                    downloadClientId: selectedDownloadClientId,
                });
            }
            else {
                await grabMutation.mutateAsync({
                    candidate,
                    downloadClientId: selectedDownloadClientId,
                });
            }
            setActionNotice({
                tone: 'success',
                message: `Grabbed ${candidate.title}`,
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to grab release.';
            setActionNotice({
                tone: 'error',
                message,
            });
        }
    };
    const handleBulkGrab = async (selectedIds) => {
        const selectedDownloadClientId = parseOptionalNumber(downloadClientId);
        const candidates = selectedIds
            .map(id => releaseById.get(String(id)))
            .filter((row) => Boolean(row?.magnetUrl));
        if (candidates.length === 0) {
            setActionNotice({
                tone: 'error',
                message: 'No selected releases contain a magnet URL.',
            });
            return;
        }
        const results = await Promise.allSettled(candidates.map(candidate => {
            const override = overridesByRowId[candidate.rowId];
            if (override) {
                return api.releaseApi.grabCandidate({
                    ...toReleasePayload(candidate),
                    language: candidate.language,
                    downloadClientId: selectedDownloadClientId,
                });
            }
            return grabMutation.mutateAsync({
                candidate,
                downloadClientId: selectedDownloadClientId,
            });
        }));
        const successCount = results.filter(result => result.status === 'fulfilled').length;
        const failureCount = results.length - successCount;
        if (failureCount === 0) {
            setActionNotice({
                tone: 'success',
                message: `Bulk grabbed ${successCount} release${successCount === 1 ? '' : 's'}.`,
            });
            return;
        }
        setActionNotice({
            tone: 'error',
            message: `Bulk grab completed with ${successCount} success and ${failureCount} failure.`,
        });
    };
    const handleSubmit = (event) => {
        event.preventDefault();
        const params = buildPayload(form, pagination, sortBy, sortDir);
        setSubmittedParams(params);
    };
    const openQueryModal = () => {
        setQueryDraft({
            season: form.season,
            episode: form.episode,
            tvdbId: form.tvdbId,
            imdbId: form.imdbId,
            year: form.year,
            artist: form.artist,
            album: form.album,
            author: form.author,
            bookTitle: form.bookTitle,
        });
        setIsQueryModalOpen(true);
    };
    return (_jsxs("section", { className: "space-y-5", children: [_jsxs("header", { className: "space-y-1", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "Search" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Manual release search across configured indexers." })] }), _jsxs("form", { className: "space-y-4 rounded-lg border border-border-subtle bg-surface-1 p-4", onSubmit: handleSubmit, children: [_jsxs("div", { className: "grid gap-3 md:grid-cols-2 xl:grid-cols-3", children: [_jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "Search query" }), _jsx("input", { "aria-label": "Search query", value: form.query, onChange: event => {
                                            const query = event.currentTarget.value;
                                            setForm(current => ({
                                                ...current,
                                                query,
                                            }));
                                        }, placeholder: "Title, release name, or query terms", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2" })] }), _jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "Search type" }), _jsxs("select", { "aria-label": "Search type", value: form.searchType, onChange: event => {
                                            const searchType = event.currentTarget.value;
                                            setForm(current => ({
                                                ...current,
                                                searchType,
                                            }));
                                        }, className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2", children: [_jsx("option", { value: "search", children: "search" }), _jsx("option", { value: "tvsearch", children: "tvsearch" }), _jsx("option", { value: "movie", children: "movie" }), _jsx("option", { value: "music", children: "music" }), _jsx("option", { value: "book", children: "book" })] })] }), _jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "Category" }), _jsx("input", { "aria-label": "Category", value: form.category, onChange: event => {
                                            const category = event.currentTarget.value;
                                            setForm(current => ({
                                                ...current,
                                                category,
                                            }));
                                        }, placeholder: "e.g. 2000", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2" })] }), _jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "Indexer" }), _jsxs("select", { "aria-label": "Indexer", value: form.indexerId, onChange: event => {
                                            const indexerId = event.currentTarget.value;
                                            setForm(current => ({
                                                ...current,
                                                indexerId,
                                            }));
                                        }, className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2", children: [_jsx("option", { value: "", children: "All indexers" }), (indexersQuery.data ?? [])
                                                .filter(indexer => indexer.supportsSearch)
                                                .map(indexer => (_jsx("option", { value: String(indexer.id), children: indexer.name }, indexer.id)))] })] }), _jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "Download client" }), _jsxs("select", { "aria-label": "Download client", value: downloadClientId, onChange: event => {
                                            setDownloadClientId(event.currentTarget.value);
                                        }, className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2", children: [_jsx("option", { value: "", children: "Default (primary)" }), (downloadClientsQuery.data ?? [])
                                                .filter(client => client.enabled)
                                                .map(client => (_jsx("option", { value: String(client.id), children: client.name }, client.id)))] })] }), _jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "Limit" }), _jsx("input", { "aria-label": "Limit", type: "number", min: 1, value: form.limit, onChange: event => {
                                            const limit = event.currentTarget.value;
                                            setForm(current => ({
                                                ...current,
                                                limit,
                                            }));
                                        }, className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2" })] }), _jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "Offset" }), _jsx("input", { "aria-label": "Offset", type: "number", min: 0, value: form.offset, onChange: event => {
                                            const offset = event.currentTarget.value;
                                            setForm(current => ({
                                                ...current,
                                                offset,
                                            }));
                                        }, className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2" })] })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-3 py-1 text-sm", onClick: () => {
                                    openQueryModal();
                                }, children: "Query parameters" }), _jsx("button", { type: "submit", className: "rounded-sm border border-border-subtle px-3 py-1 text-sm", children: "Search releases" })] })] }), submittedParams ? (_jsx(QueryPanel, { isLoading: releasesQuery.isPending, isError: releasesQuery.isError, isEmpty: releasesQuery.isResolvedEmpty, errorMessage: releasesQuery.error?.message, onRetry: () => {
                    void releasesQuery.refetch();
                }, emptyTitle: "No results", emptyBody: "Try broader criteria or a different indexer selection.", children: _jsxs("div", { className: "space-y-3", children: [actionNotice ? (_jsx("p", { className: `rounded-sm border px-3 py-2 text-sm ${actionNotice.tone === 'success'
                                ? 'border-status-completed/40 bg-status-completed/15 text-status-completed'
                                : 'border-status-error/40 bg-status-error/15 text-status-error'}`, role: "status", children: actionNotice.message })) : null, _jsxs("section", { className: "space-y-3 rounded-md border border-border-subtle bg-surface-1 p-3", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-4", children: [_jsxs("label", { className: "grid gap-1 text-xs", children: [_jsx("span", { children: "Sort by" }), _jsxs("select", { "aria-label": "Sort by", className: "rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-xs", value: sortBy, onChange: event => {
                                                        setSortBy(event.currentTarget.value);
                                                    }, children: [_jsx("option", { value: "seeders", children: "Seeders" }), _jsx("option", { value: "size", children: "Size" }), _jsx("option", { value: "age", children: "Age" }), _jsx("option", { value: "title", children: "Title" })] })] }), _jsxs("label", { className: "grid gap-1 text-xs", children: [_jsx("span", { children: "Sort order" }), _jsxs("select", { "aria-label": "Sort order", className: "rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-xs", value: sortDir, onChange: event => {
                                                        setSortDir(event.currentTarget.value);
                                                    }, children: [_jsx("option", { value: "desc", children: "Descending" }), _jsx("option", { value: "asc", children: "Ascending" })] })] })] }), _jsxs("div", { className: "grid gap-3 md:grid-cols-3 xl:grid-cols-6", children: [_jsxs("label", { className: "grid gap-1 text-xs", children: [_jsx("span", { children: "Indexer filter" }), _jsxs("select", { "aria-label": "Indexer filter", className: "rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-xs", value: indexerFilter, onChange: event => {
                                                        setIndexerFilter(event.currentTarget.value);
                                                    }, children: [_jsx("option", { value: "all", children: "all" }), availableIndexerFilters.map(indexerName => (_jsx("option", { value: indexerName, children: indexerName }, indexerName)))] })] }), _jsxs("label", { className: "grid gap-1 text-xs", children: [_jsx("span", { children: "Category filter" }), _jsxs("select", { "aria-label": "Category filter", className: "rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-xs", value: categoryFilter, onChange: event => {
                                                        setCategoryFilter(event.currentTarget.value);
                                                    }, children: [_jsx("option", { value: "all", children: "all" }), availableCategoryFilters.map(category => (_jsx("option", { value: String(category), children: category }, category)))] })] }), _jsxs("label", { className: "grid gap-1 text-xs", children: [_jsx("span", { children: "Quality filter" }), _jsxs("select", { "aria-label": "Quality filter", className: "rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-xs", value: qualityFilter, onChange: event => {
                                                        setQualityFilter(event.currentTarget.value);
                                                    }, children: [_jsx("option", { value: "all", children: "all" }), availableQualityFilters.map(quality => (_jsx("option", { value: quality, children: quality }, quality)))] })] }), _jsxs("label", { className: "grid gap-1 text-xs", children: [_jsx("span", { children: "Protocol filter" }), _jsxs("select", { "aria-label": "Protocol filter", className: "rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-xs", value: protocolFilter, onChange: event => {
                                                        setProtocolFilter(event.currentTarget.value);
                                                    }, children: [_jsx("option", { value: "all", children: "all" }), _jsx("option", { value: "torrent", children: "torrent" }), _jsx("option", { value: "usenet", children: "usenet" }), _jsx("option", { value: "unknown", children: "unknown" })] })] }), _jsxs("label", { className: "grid gap-1 text-xs", children: [_jsx("span", { children: "Minimum size (GB)" }), _jsx("input", { "aria-label": "Minimum size (GB)", type: "number", min: 0, step: "0.1", value: minSizeGbFilter, onChange: event => {
                                                        setMinSizeGbFilter(event.currentTarget.value);
                                                    }, className: "rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-xs" })] }), _jsxs("label", { className: "grid gap-1 text-xs", children: [_jsx("span", { children: "Minimum seeders" }), _jsx("input", { "aria-label": "Minimum seeders", type: "number", min: 0, value: minSeedersFilter, onChange: event => {
                                                        setMinSeedersFilter(event.currentTarget.value);
                                                    }, className: "rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-xs" })] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-2 py-1 text-xs", onClick: () => {
                                                setShowCustomFilters(current => !current);
                                            }, children: showCustomFilters ? 'Hide custom filters' : 'Show custom filters' }), customFilter ? (_jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-2 py-1 text-xs", onClick: () => {
                                                setCustomFilter(null);
                                            }, children: "Clear custom filters" })) : null] }), showCustomFilters ? (_jsx(FilterBuilder, { fields: [
                                        { key: 'title', label: 'Title' },
                                        { key: 'indexer', label: 'Indexer' },
                                        { key: 'protocol', label: 'Protocol' },
                                        { key: 'size', label: 'Size (GB)' },
                                        { key: 'seeders', label: 'Seeders' },
                                    ], onApply: result => {
                                        setCustomFilter(result);
                                    } })) : null] }), _jsxs(SelectProvider, { rowIds: filteredReleaseRows.map(row => row.rowId), children: [_jsx(DataTable, { data: filteredReleaseRows, columns: columns, getRowId: row => row.rowId, rowActions: row => {
                                        const downloadHref = row.downloadUrl ?? row.magnetUrl;
                                        return (_jsxs("div", { className: "flex items-center justify-end gap-2", children: [_jsx("button", { type: "button", "aria-label": `Grab release ${row.title}`, className: "rounded-sm border border-border-subtle px-2 py-1 text-xs", disabled: grabMutation.isPending || !row.magnetUrl, onClick: () => {
                                                        void handleGrab(row);
                                                    }, children: "Grab" }), downloadHref ? (_jsx("a", { "aria-label": `Download release ${row.title}`, className: "rounded-sm border border-border-subtle px-2 py-1 text-xs", href: downloadHref, target: "_blank", rel: "noreferrer", children: "Download" })) : (_jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-2 py-1 text-xs", disabled: true, children: "Download" })), _jsx("button", { type: "button", "aria-label": `Override match ${row.title}`, className: "rounded-sm border border-border-subtle px-2 py-1 text-xs", onClick: () => {
                                                        const currentOverride = overridesByRowId[row.rowId];
                                                        setOverrideTarget(row);
                                                        setOverrideTitle(currentOverride?.title ?? row.title);
                                                        setOverrideCategory((currentOverride?.categories ?? row.categories ?? []).join(','));
                                                        setOverrideQuality(currentOverride?.quality ?? row.quality ?? '');
                                                        setOverrideLanguage(currentOverride?.language ?? row.language ?? '');
                                                    }, children: "Override" })] }));
                                    } }), _jsx(SelectFooter, { actions: [
                                        {
                                            label: 'Bulk grab',
                                            onClick: selectedIds => {
                                                void handleBulkGrab(selectedIds);
                                            },
                                        },
                                    ] })] }), releasesQuery.data && releasesQuery.data.meta.totalCount > 0 && (_jsxs("div", { className: "flex items-center justify-between rounded-md border border-border-subtle bg-surface-1 px-4 py-2", children: [_jsxs("div", { className: "text-sm text-text-secondary", children: ["Showing ", Math.min((pagination.page - 1) * pagination.pageSize + 1, releasesQuery.data.meta.totalCount), " to", ' ', Math.min(pagination.page * pagination.pageSize, releasesQuery.data.meta.totalCount), " of", ' ', releasesQuery.data.meta.totalCount, " results"] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-3 py-1 text-sm disabled:opacity-50", disabled: pagination.page <= 1 || releasesQuery.isPending, onClick: () => {
                                                setPagination(current => ({ ...current, page: current.page - 1 }));
                                            }, children: "Previous" }), _jsxs("span", { className: "text-sm", children: ["Page ", pagination.page, " of ", Math.ceil(releasesQuery.data.meta.totalCount / pagination.pageSize)] }), _jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-3 py-1 text-sm disabled:opacity-50", disabled: pagination.page * pagination.pageSize >= releasesQuery.data.meta.totalCount ||
                                                releasesQuery.isPending, onClick: () => {
                                                setPagination(current => ({ ...current, page: current.page + 1 }));
                                            }, children: "Next" })] })] }))] }) })) : (_jsx("section", { className: "rounded-md border border-border-subtle bg-surface-1 p-4 text-sm text-text-secondary", children: "Run a manual search to inspect release results and ranking." })), _jsxs(Modal, { isOpen: isQueryModalOpen, ariaLabel: "Query parameters", onClose: () => {
                    setIsQueryModalOpen(false);
                }, children: [_jsx(ModalHeader, { title: "Query parameters", onClose: () => {
                            setIsQueryModalOpen(false);
                        } }), _jsx(ModalBody, { children: _jsxs("div", { className: "grid gap-3 md:grid-cols-2", children: [form.searchType === 'tvsearch' ? (_jsxs(_Fragment, { children: [_jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "Season" }), _jsx("input", { "aria-label": "Season", type: "number", min: 1, value: queryDraft.season, onChange: event => {
                                                        const season = event.currentTarget.value;
                                                        setQueryDraft(current => ({
                                                            ...current,
                                                            season,
                                                        }));
                                                    }, className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2" })] }), _jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "Episode" }), _jsx("input", { "aria-label": "Episode", type: "number", min: 1, value: queryDraft.episode, onChange: event => {
                                                        const episode = event.currentTarget.value;
                                                        setQueryDraft(current => ({
                                                            ...current,
                                                            episode,
                                                        }));
                                                    }, className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2" })] }), _jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "TVDB ID" }), _jsx("input", { "aria-label": "TVDB ID", type: "number", min: 1, value: queryDraft.tvdbId, onChange: event => {
                                                        const tvdbId = event.currentTarget.value;
                                                        setQueryDraft(current => ({
                                                            ...current,
                                                            tvdbId,
                                                        }));
                                                    }, className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2" })] })] })) : null, form.searchType === 'movie' ? (_jsxs(_Fragment, { children: [_jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "IMDB ID" }), _jsx("input", { "aria-label": "IMDB ID", value: queryDraft.imdbId, onChange: event => {
                                                        const imdbId = event.currentTarget.value;
                                                        setQueryDraft(current => ({
                                                            ...current,
                                                            imdbId,
                                                        }));
                                                    }, className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2" })] }), _jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "Year" }), _jsx("input", { "aria-label": "Year", type: "number", min: 1900, value: queryDraft.year, onChange: event => {
                                                        const year = event.currentTarget.value;
                                                        setQueryDraft(current => ({
                                                            ...current,
                                                            year,
                                                        }));
                                                    }, className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2" })] })] })) : null, form.searchType === 'music' ? (_jsxs(_Fragment, { children: [_jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "Artist" }), _jsx("input", { "aria-label": "Artist", value: queryDraft.artist, onChange: event => {
                                                        const artist = event.currentTarget.value;
                                                        setQueryDraft(current => ({
                                                            ...current,
                                                            artist,
                                                        }));
                                                    }, className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2" })] }), _jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "Album" }), _jsx("input", { "aria-label": "Album", value: queryDraft.album, onChange: event => {
                                                        const album = event.currentTarget.value;
                                                        setQueryDraft(current => ({
                                                            ...current,
                                                            album,
                                                        }));
                                                    }, className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2" })] })] })) : null, form.searchType === 'book' ? (_jsxs(_Fragment, { children: [_jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "Author" }), _jsx("input", { "aria-label": "Author", value: queryDraft.author, onChange: event => {
                                                        const author = event.currentTarget.value;
                                                        setQueryDraft(current => ({
                                                            ...current,
                                                            author,
                                                        }));
                                                    }, className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2" })] }), _jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "Title" }), _jsx("input", { "aria-label": "Title", value: queryDraft.bookTitle, onChange: event => {
                                                        const bookTitle = event.currentTarget.value;
                                                        setQueryDraft(current => ({
                                                            ...current,
                                                            bookTitle,
                                                        }));
                                                    }, className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2" })] })] })) : null, form.searchType === 'search' ? (_jsx("p", { className: "text-sm text-text-secondary", children: "No type-specific parameters available for generic search." })) : null] }) }), _jsxs(ModalFooter, { children: [_jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-3 py-1 text-sm", onClick: () => {
                                    setIsQueryModalOpen(false);
                                }, children: "Cancel" }), _jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-3 py-1 text-sm", onClick: () => {
                                    setForm(current => ({
                                        ...current,
                                        season: queryDraft.season,
                                        episode: queryDraft.episode,
                                        tvdbId: queryDraft.tvdbId,
                                        imdbId: queryDraft.imdbId,
                                        year: queryDraft.year,
                                        artist: queryDraft.artist,
                                        album: queryDraft.album,
                                        author: queryDraft.author,
                                        bookTitle: queryDraft.bookTitle,
                                    }));
                                    setIsQueryModalOpen(false);
                                }, children: "Apply parameters" })] })] }), _jsxs(Modal, { isOpen: Boolean(overrideTarget), ariaLabel: "Override release match", onClose: () => {
                    setOverrideTarget(null);
                    setOverrideTitle('');
                    setOverrideCategory('');
                    setOverrideQuality('');
                    setOverrideLanguage('');
                }, children: [_jsx(ModalHeader, { title: "Override release match", onClose: () => {
                            setOverrideTarget(null);
                            setOverrideTitle('');
                            setOverrideCategory('');
                            setOverrideQuality('');
                            setOverrideLanguage('');
                        } }), _jsx(ModalBody, { children: _jsxs("div", { className: "grid gap-3 md:grid-cols-2", children: [_jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "Override title" }), _jsx("input", { "aria-label": "Override title", value: overrideTitle, onChange: event => {
                                                setOverrideTitle(event.currentTarget.value);
                                            }, className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2" })] }), _jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "Category override" }), _jsx("input", { "aria-label": "Category override", value: overrideCategory, onChange: event => {
                                                setOverrideCategory(event.currentTarget.value);
                                            }, placeholder: "e.g. 5000,5030", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2" })] }), _jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "Quality override" }), _jsx("input", { "aria-label": "Quality override", value: overrideQuality, onChange: event => {
                                                setOverrideQuality(event.currentTarget.value);
                                            }, className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2" })] }), _jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "Language override" }), _jsx("input", { "aria-label": "Language override", value: overrideLanguage, onChange: event => {
                                                setOverrideLanguage(event.currentTarget.value);
                                            }, className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2" })] })] }) }), _jsxs(ModalFooter, { children: [_jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-3 py-1 text-sm", onClick: () => {
                                    setOverrideTarget(null);
                                    setOverrideTitle('');
                                    setOverrideCategory('');
                                    setOverrideQuality('');
                                    setOverrideLanguage('');
                                }, children: "Cancel" }), _jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-3 py-1 text-sm", onClick: () => {
                                    if (!overrideTarget) {
                                        return;
                                    }
                                    const nextTitle = overrideTitle.trim();
                                    if (nextTitle.length === 0) {
                                        return;
                                    }
                                    const nextCategories = overrideCategory
                                        .split(',')
                                        .map(value => value.trim())
                                        .filter(Boolean)
                                        .map(value => Number.parseInt(value, 10))
                                        .filter(value => Number.isFinite(value));
                                    const nextQuality = overrideQuality.trim();
                                    const nextLanguage = overrideLanguage.trim();
                                    setOverridesByRowId(current => ({
                                        ...current,
                                        [overrideTarget.rowId]: {
                                            title: nextTitle,
                                            ...(nextCategories.length > 0 ? { categories: nextCategories } : {}),
                                            ...(nextQuality.length > 0 ? { quality: nextQuality } : {}),
                                            ...(nextLanguage.length > 0 ? { language: nextLanguage } : {}),
                                        },
                                    }));
                                    setOverrideTarget(null);
                                    setOverrideTitle('');
                                    setOverrideCategory('');
                                    setOverrideQuality('');
                                    setOverrideLanguage('');
                                }, children: "Apply override" })] })] })] }));
}
//# sourceMappingURL=page.js.map