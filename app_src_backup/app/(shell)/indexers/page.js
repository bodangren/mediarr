'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FilterBuilder } from '@/components/filters/FilterBuilder';
import { FilterDropdown } from '@/components/filters/FilterDropdown';
import { DataTable } from '@/components/primitives/DataTable';
import { ConfirmModal, Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/primitives/Modal';
import { PageJumpBar, matchesJumpFilter } from '@/components/primitives/PageJumpBar';
import { PageToolbar, PageToolbarSection } from '@/components/primitives/PageToolbar';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { SelectFooter } from '@/components/primitives/SelectFooter';
import { SelectProvider, useSelectContext } from '@/components/primitives/SelectProvider';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { healthStatus } from '@/lib/health';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { useOptimisticMutation } from '@/lib/query/useOptimisticMutation';
import { getPopularPresets, indexerPresets } from '@/lib/indexer/indexerPresets';
import { AddIndexerModal } from './AddIndexerModal';
import { EditIndexerModal } from './EditIndexerModal';
function normalizeBooleanValue(value) {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'number') {
        return value !== 0;
    }
    if (typeof value === 'string') {
        return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());
    }
    return false;
}
function stringMatches(actual, expected, operator) {
    switch (operator) {
        case 'equals':
            return actual === expected;
        case 'notEquals':
            return actual !== expected;
        case 'contains':
            return actual.includes(expected);
        case 'notContains':
            return !actual.includes(expected);
        default:
            return false;
    }
}
function arrayMatches(values, expected, operator) {
    if (operator === 'equals' || operator === 'contains') {
        return values.some(value => value === expected || value.includes(expected));
    }
    if (operator === 'notEquals' || operator === 'notContains') {
        return values.every(value => value !== expected && !value.includes(expected));
    }
    return false;
}
function parseIndexerSettings(settings) {
    try {
        return JSON.parse(settings);
    }
    catch {
        return {};
    }
}
function parseTagsFromSettings(settings) {
    const parsed = parseIndexerSettings(settings);
    if (Array.isArray(parsed.tags)) {
        return parsed.tags.map(value => String(value).trim()).filter(Boolean);
    }
    if (typeof parsed.tag === 'string' && parsed.tag.trim().length > 0) {
        return [parsed.tag.trim()];
    }
    return [];
}
function getIndexerTags(row) {
    const direct = row.tags;
    if (Array.isArray(direct)) {
        return direct.map(value => String(value).trim()).filter(Boolean);
    }
    return parseTagsFromSettings(row.settings);
}
function getIndexerCapabilities(row) {
    const explicit = row.capabilities;
    if (Array.isArray(explicit)) {
        return explicit.map(value => String(value).toLowerCase().trim()).filter(Boolean);
    }
    const derived = [];
    if (row.supportsRss) {
        derived.push('rss');
    }
    if (row.supportsSearch) {
        derived.push('search');
    }
    return [...new Set(derived)];
}
function getIndexerCategories(row) {
    const parsed = parseIndexerSettings(row.settings);
    if (Array.isArray(parsed.categories)) {
        return parsed.categories.map(value => String(value).trim()).filter(Boolean);
    }
    if (typeof parsed.category === 'string' && parsed.category.trim().length > 0) {
        return [parsed.category.trim()];
    }
    return [];
}
function getIndexerPrivacy(row) {
    const parsed = parseIndexerSettings(row.settings);
    if (typeof parsed.privacy === 'string' && parsed.privacy.trim().length > 0) {
        return parsed.privacy.trim();
    }
    return null;
}
function titleCase(value) {
    if (!value) {
        return value;
    }
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}
function evaluateIndexerCondition(row, condition) {
    if (condition.field === 'enabled') {
        const expected = normalizeBooleanValue(condition.value);
        const actual = normalizeBooleanValue(row.enabled);
        if (condition.operator === 'equals') {
            return actual === expected;
        }
        if (condition.operator === 'notEquals') {
            return actual !== expected;
        }
        return false;
    }
    if (condition.field === 'priority') {
        const actual = Number(row.priority);
        const expected = Number(condition.value);
        if (!Number.isFinite(actual) || !Number.isFinite(expected)) {
            return false;
        }
        if (condition.operator === 'equals') {
            return actual === expected;
        }
        if (condition.operator === 'notEquals') {
            return actual !== expected;
        }
        if (condition.operator === 'greaterThan') {
            return actual > expected;
        }
        if (condition.operator === 'lessThan') {
            return actual < expected;
        }
        return false;
    }
    if (condition.field === 'capability') {
        const capabilities = getIndexerCapabilities(row).map(value => value.toLowerCase());
        const expected = String(condition.value ?? '').toLowerCase().trim();
        return arrayMatches(capabilities, expected, condition.operator);
    }
    if (condition.field === 'tag') {
        const tags = getIndexerTags(row).map(value => value.toLowerCase());
        const expected = String(condition.value ?? '').toLowerCase().trim();
        return arrayMatches(tags, expected, condition.operator);
    }
    if (condition.field === 'protocol') {
        const actual = String(row.protocol ?? '').toLowerCase().trim();
        const expected = String(condition.value ?? '').toLowerCase().trim();
        return stringMatches(actual, expected, condition.operator);
    }
    return false;
}
function applyIndexerFilter(rows, conditions) {
    if (!conditions || conditions.conditions.length === 0) {
        return rows;
    }
    return rows.filter(row => {
        const checks = conditions.conditions.map(condition => evaluateIndexerCondition(row, condition));
        return conditions.operator === 'and' ? checks.every(Boolean) : checks.some(Boolean);
    });
}
function SelectionCheckbox({ rowId }) {
    const { isSelected, toggleRow } = useSelectContext();
    return (_jsx("input", { type: "checkbox", "aria-label": "Select row", checked: isSelected(rowId), onChange: event => toggleRow(rowId, event.nativeEvent.shiftKey) }));
}
function toSaveIndexerInput(draft) {
    return {
        name: draft.name,
        implementation: draft.implementation,
        configContract: draft.configContract,
        protocol: draft.protocol,
        ...(draft.appProfileId !== undefined ? { appProfileId: draft.appProfileId } : {}),
        enabled: draft.enabled,
        supportsRss: draft.supportsRss,
        supportsSearch: draft.supportsSearch,
        priority: draft.priority,
        settings: JSON.stringify(draft.settings),
    };
}
const addIndexerPresets = [
    // Popular indexers from Prowlarr definitions
    ...getPopularPresets(),
    // Generic Torznab for custom torrent indexers
    {
        id: 'torznab-generic',
        name: 'Generic Torznab',
        description: 'Custom torrent tracker using Torznab contract.',
        protocol: 'torrent',
        implementation: 'Torznab',
        configContract: 'TorznabSettings',
        privacy: 'Public',
        fields: [
            { name: 'url', label: 'Indexer URL', type: 'text', required: true },
            { name: 'apiKey', label: 'API Key', type: 'password', required: true },
        ],
    },
];
export default function IndexersPage() {
    const api = useMemo(() => getApiClients(), []);
    const queryClient = useQueryClient();
    const { pushToast } = useToast();
    const [editing, setEditing] = useState(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [testOutput, setTestOutput] = useState({});
    const [jumpFilter, setJumpFilter] = useState('All');
    const [selectionModeEnabled, setSelectionModeEnabled] = useState(false);
    const [pendingBulkDeleteIds, setPendingBulkDeleteIds] = useState([]);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
    const [bulkEditIds, setBulkEditIds] = useState([]);
    const [bulkEditEnabled, setBulkEditEnabled] = useState(false);
    const [bulkEditPriority, setBulkEditPriority] = useState('');
    const [isApplyingBulkEdit, setIsApplyingBulkEdit] = useState(false);
    const [selectedFilterId, setSelectedFilterId] = useState(null);
    const [customFilter, setCustomFilter] = useState(null);
    const [isFilterBuilderOpen, setIsFilterBuilderOpen] = useState(false);
    const [infoRow, setInfoRow] = useState(null);
    const indexersQuery = useApiQuery({
        queryKey: queryKeys.indexers(),
        queryFn: () => api.indexerApi.list(),
        staleTimeKind: 'list',
        isEmpty: rows => rows.length === 0,
    });
    const appProfilesQuery = useApiQuery({
        queryKey: queryKeys.appProfiles(),
        queryFn: () => api.appProfilesApi.list(),
    });
    const filtersQuery = useApiQuery({
        queryKey: queryKeys.filtersList('indexer'),
        queryFn: () => api.filtersApi.list('indexer'),
        staleTimeKind: 'list',
        isEmpty: data => data.length === 0,
    });
    const enableMutation = useOptimisticMutation({
        queryKey: queryKeys.indexers(),
        mutationFn: variables => api.indexerApi.update(variables.id, { enabled: variables.enabled }),
        updater: (current, variables) => {
            return current.map(item => {
                if (item.id !== variables.id) {
                    return item;
                }
                return {
                    ...item,
                    enabled: variables.enabled,
                };
            });
        },
        errorMessage: 'Could not update indexer enabled state.',
    });
    const priorityMutation = useOptimisticMutation({
        queryKey: queryKeys.indexers(),
        mutationFn: variables => api.indexerApi.update(variables.id, { priority: variables.priority }),
        updater: (current, variables) => {
            return current.map(item => {
                if (item.id !== variables.id) {
                    return item;
                }
                return {
                    ...item,
                    priority: variables.priority,
                };
            });
        },
        errorMessage: 'Could not update indexer priority.',
    });
    const deleteMutation = useMutation({
        mutationFn: (id) => api.indexerApi.remove(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.indexers() });
            pushToast({
                title: 'Indexer deleted',
                variant: 'success',
            });
        },
    });
    const createMutation = useMutation({
        mutationFn: (payload) => api.indexerApi.create(payload),
        onSuccess: () => {
            pushToast({
                title: 'Indexer created',
                variant: 'success',
            });
            setIsAddModalOpen(false);
            void queryClient.invalidateQueries({ queryKey: queryKeys.indexers() });
        },
        onError: (error) => {
            pushToast({
                title: 'Save failed',
                message: error.message,
                variant: 'error',
            });
        },
    });
    const editMutation = useMutation({
        mutationFn: ({ id, payload }) => api.indexerApi.update(id, payload),
        onSuccess: () => {
            pushToast({
                title: 'Indexer updated',
                variant: 'success',
            });
            setEditing(null);
            void queryClient.invalidateQueries({ queryKey: queryKeys.indexers() });
        },
        onError: (error) => {
            pushToast({
                title: 'Save failed',
                message: error.message,
                variant: 'error',
            });
        },
    });
    const testMutation = useMutation({
        mutationFn: (id) => api.indexerApi.test(id),
        onSuccess: (result, id) => {
            setTestOutput(current => ({
                ...current,
                [id]: {
                    message: result.message,
                    hints: result.diagnostics?.remediationHints ?? [],
                },
            }));
            pushToast({
                title: result.success ? 'Indexer test passed' : 'Indexer test failed',
                message: result.message,
                variant: result.success ? 'success' : 'error',
            });
            void queryClient.invalidateQueries({ queryKey: ['health'] });
        },
    });
    const draftTestMutation = useMutation({
        mutationFn: (payload) => api.indexerApi.testDraft(payload),
    });
    const cloneMutation = useMutation({
        mutationFn: (id) => api.indexerApi.clone(id),
        onSuccess: () => {
            pushToast({
                title: 'Indexer cloned',
                variant: 'success',
            });
            void queryClient.invalidateQueries({ queryKey: queryKeys.indexers() });
        },
        onError: (error) => {
            pushToast({
                title: 'Clone failed',
                message: error.message,
                variant: 'error',
            });
        },
    });
    const columns = [
        {
            key: 'name',
            header: 'Name',
            sortable: true,
            render: row => (_jsxs("div", { children: [_jsx("p", { className: "font-medium", children: row.name }), _jsx("p", { className: "text-xs text-text-muted", children: row.implementation })] })),
        },
        {
            key: 'protocol',
            header: 'Protocol',
            render: row => row.protocol,
        },
        {
            key: 'capabilities',
            header: 'Capabilities',
            render: row => {
                const badges = [];
                if (row.supportsRss) {
                    badges.push('RSS');
                }
                if (row.supportsSearch) {
                    badges.push('Search');
                }
                const privacy = getIndexerPrivacy(row);
                if (privacy) {
                    badges.push(titleCase(privacy));
                }
                badges.push(titleCase(row.protocol));
                return (_jsx("div", { className: "flex flex-wrap gap-1", children: badges.map(badge => (_jsx("span", { className: "rounded-full border border-border-subtle px-2 py-0.5 text-[10px] font-medium", children: badge }, badge))) }));
            },
        },
        {
            key: 'enabled',
            header: 'Enabled',
            render: row => (_jsxs("label", { className: "inline-flex items-center gap-2 text-xs", children: [_jsx("input", { type: "checkbox", checked: row.enabled, onChange: event => {
                            enableMutation.mutate({
                                id: row.id,
                                enabled: event.currentTarget.checked,
                            });
                        } }), row.enabled ? 'On' : 'Off'] })),
        },
        {
            key: 'priority',
            header: 'Priority',
            sortable: true,
            render: row => (_jsx("input", { type: "number", className: "w-20 rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-xs", defaultValue: row.priority, onBlur: event => {
                    const value = Number.parseInt(event.currentTarget.value, 10);
                    if (Number.isNaN(value)) {
                        return;
                    }
                    priorityMutation.mutate({
                        id: row.id,
                        priority: value,
                    });
                } })),
        },
        {
            key: 'health',
            header: 'Health',
            render: row => _jsx(StatusBadge, { status: healthStatus(row) }),
        },
    ];
    const handleCreateFromModal = (draft) => {
        createMutation.mutate(toSaveIndexerInput(draft));
    };
    const handleEditFromModal = (draft) => {
        editMutation.mutate({
            id: draft.id,
            payload: {
                name: draft.name,
                implementation: draft.implementation,
                configContract: draft.configContract,
                protocol: draft.protocol,
                ...(draft.appProfileId !== undefined ? { appProfileId: draft.appProfileId } : {}),
                enabled: draft.enabled,
                supportsRss: draft.supportsRss,
                supportsSearch: draft.supportsSearch,
                priority: draft.priority,
                settings: JSON.stringify(draft.settings),
            },
        });
    };
    const handleDraftConnectionTest = async (draft) => {
        const result = await draftTestMutation.mutateAsync(toSaveIndexerInput(draft));
        return {
            success: result.success,
            message: result.message,
            hints: result.diagnostics?.remediationHints ?? [],
        };
    };
    const savedFilters = filtersQuery.data ?? [];
    const activeSavedFilter = typeof selectedFilterId === 'number' ? savedFilters.find(filter => filter.id === selectedFilterId) ?? null : null;
    const activeFilterConditions = selectedFilterId === 'custom' ? customFilter : activeSavedFilter?.conditions ?? null;
    const filteredRows = useMemo(() => {
        const rows = indexersQuery.data ?? [];
        const jumped = rows.filter(row => matchesJumpFilter(row.name, jumpFilter));
        return applyIndexerFilter(jumped, activeFilterConditions);
    }, [indexersQuery.data, jumpFilter, activeFilterConditions]);
    const activeFilterForBuilder = selectedFilterId === 'custom'
        ? {
            id: undefined,
            name: 'Custom',
            type: 'indexer',
            conditions: customFilter ?? { operator: 'and', conditions: [] },
        }
        : activeSavedFilter
            ? {
                id: activeSavedFilter.id,
                name: activeSavedFilter.name,
                type: 'indexer',
                conditions: activeSavedFilter.conditions,
            }
            : null;
    const tableColumns = selectionModeEnabled
        ? [
            {
                key: 'select',
                header: 'Select',
                className: 'w-16',
                render: row => _jsx(SelectionCheckbox, { rowId: row.id }),
            },
            ...columns,
        ]
        : columns;
    const handleBulkDelete = async () => {
        if (pendingBulkDeleteIds.length === 0 || isBulkDeleting) {
            return;
        }
        setIsBulkDeleting(true);
        const results = await Promise.allSettled(pendingBulkDeleteIds.map(id => api.indexerApi.remove(id)));
        const deletedCount = results.filter(result => result.status === 'fulfilled').length;
        const failedCount = results.length - deletedCount;
        if (deletedCount > 0) {
            pushToast({
                title: `Deleted ${deletedCount} indexers`,
                variant: 'success',
            });
            void queryClient.invalidateQueries({ queryKey: queryKeys.indexers() });
        }
        if (failedCount > 0) {
            pushToast({
                title: `Failed to delete ${failedCount} indexers`,
                variant: 'error',
            });
        }
        setIsBulkDeleting(false);
        setPendingBulkDeleteIds([]);
    };
    const handleBulkTest = async (selectedIds) => {
        const indexerIds = selectedIds.map(id => Number(id)).filter(id => Number.isFinite(id));
        if (indexerIds.length === 0) {
            return;
        }
        const results = await Promise.allSettled(indexerIds.map(async (id) => {
            const result = await api.indexerApi.test(id);
            return { id, result };
        }));
        let passed = 0;
        let failed = 0;
        const diagnostics = {};
        results.forEach(result => {
            if (result.status === 'fulfilled') {
                diagnostics[result.value.id] = {
                    message: result.value.result.message,
                    hints: result.value.result.diagnostics?.remediationHints ?? [],
                };
                if (result.value.result.success) {
                    passed += 1;
                }
                else {
                    failed += 1;
                }
                return;
            }
            failed += 1;
        });
        setTestOutput(current => ({
            ...current,
            ...diagnostics,
        }));
        pushToast({
            title: 'Bulk indexer test complete',
            message: `${passed} passed, ${failed} failed`,
            variant: failed > 0 ? 'warning' : 'success',
        });
        void queryClient.invalidateQueries({ queryKey: ['health'] });
    };
    const openBulkEdit = (selectedIds) => {
        const indexerIds = selectedIds.map(id => Number(id)).filter(id => Number.isFinite(id));
        if (indexerIds.length === 0) {
            return;
        }
        setBulkEditIds(indexerIds);
        setBulkEditEnabled(false);
        setBulkEditPriority('');
        setIsBulkEditOpen(true);
    };
    const handleBulkEditApply = async () => {
        if (bulkEditIds.length === 0 || isApplyingBulkEdit) {
            return;
        }
        const parsedPriority = Number.parseInt(bulkEditPriority, 10);
        const payload = {
            enabled: bulkEditEnabled,
        };
        if (!Number.isNaN(parsedPriority)) {
            payload.priority = parsedPriority;
        }
        setIsApplyingBulkEdit(true);
        const results = await Promise.allSettled(bulkEditIds.map(id => api.indexerApi.update(id, payload)));
        const successCount = results.filter(result => result.status === 'fulfilled').length;
        const failedCount = results.length - successCount;
        if (successCount > 0) {
            pushToast({
                title: `Updated ${successCount} indexers`,
                variant: 'success',
            });
            void queryClient.invalidateQueries({ queryKey: queryKeys.indexers() });
        }
        if (failedCount > 0) {
            pushToast({
                title: `Failed to update ${failedCount} indexers`,
                variant: 'error',
            });
        }
        setIsApplyingBulkEdit(false);
        setIsBulkEditOpen(false);
        setBulkEditIds([]);
    };
    return (_jsxs("section", { className: "space-y-5", children: [_jsxs("header", { className: "space-y-1", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "Indexer Management" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Control indexer state, priority, diagnostics, and protocol-specific settings." })] }), _jsxs(PageToolbar, { children: [_jsxs(PageToolbarSection, { children: [_jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-3 py-1 text-sm", onClick: () => {
                                    setEditing(null);
                                    setIsAddModalOpen(true);
                                }, children: "Add" }), _jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-3 py-1 text-sm", onClick: () => {
                                    void indexersQuery.refetch();
                                }, children: "Refresh" }), _jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-3 py-1 text-sm", onClick: () => {
                                    void indexersQuery.refetch();
                                    pushToast({
                                        title: 'Indexer sync requested',
                                        variant: 'info',
                                    });
                                }, children: "Sync" }), _jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-3 py-1 text-sm", onClick: () => setSelectionModeEnabled(previous => !previous), children: "Select Mode" })] }), _jsx(PageToolbarSection, { align: "right", children: selectionModeEnabled ? _jsx("span", { className: "text-xs text-text-secondary", children: "Selection mode enabled" }) : null })] }), _jsx("div", { className: "flex flex-wrap items-center gap-2", children: _jsx(FilterDropdown, { id: "indexer-filter-dropdown", label: "Saved Filter", allLabel: "All indexers", filters: savedFilters, selectedFilterId: selectedFilterId, onSelectFilter: value => {
                        setSelectedFilterId(value);
                        if (value !== 'custom') {
                            setCustomFilter(null);
                        }
                    }, onOpenBuilder: () => setIsFilterBuilderOpen(true) }) }), _jsx(PageJumpBar, { value: jumpFilter, onChange: setJumpFilter }), _jsx(QueryPanel, { isLoading: indexersQuery.isPending, isError: indexersQuery.isError, isEmpty: indexersQuery.isResolvedEmpty, errorMessage: indexersQuery.error?.message, onRetry: () => void indexersQuery.refetch(), emptyTitle: "No indexers configured", emptyBody: "Create your first indexer below.", children: selectionModeEnabled ? (_jsx(SelectProvider, { rowIds: filteredRows.map(row => row.id), children: _jsxs("div", { className: "space-y-3", children: [_jsx(DataTable, { data: filteredRows, columns: tableColumns, getRowId: row => row.id, onSort: () => {
                                    // Sorting is managed by backend defaults for now.
                                }, rowActions: row => (_jsxs("div", { className: "flex justify-end gap-2", children: [_jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-2 py-1 text-xs", onClick: () => setInfoRow(row), children: "Info" }), _jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-2 py-1 text-xs", onClick: () => {
                                                setIsAddModalOpen(false);
                                                setEditing(row);
                                            }, children: "Edit" }), _jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-2 py-1 text-xs", onClick: () => testMutation.mutate(row.id), children: "Test" }), _jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-2 py-1 text-xs", onClick: () => cloneMutation.mutate(row.id), children: "Clone" }), _jsx("button", { type: "button", className: "rounded-sm border border-status-error/60 px-2 py-1 text-xs text-status-error", onClick: () => deleteMutation.mutate(row.id), children: "Delete" })] })) }), _jsx(SelectFooter, { actions: [
                                    {
                                        label: 'Delete Selected',
                                        onClick: selectedIds => {
                                            setPendingBulkDeleteIds(selectedIds.map(id => Number(id)).filter(id => Number.isFinite(id)));
                                        },
                                    },
                                    {
                                        label: 'Test Selected',
                                        onClick: selectedIds => {
                                            void handleBulkTest(selectedIds);
                                        },
                                    },
                                    {
                                        label: 'Bulk Edit',
                                        onClick: selectedIds => {
                                            openBulkEdit(selectedIds);
                                        },
                                    },
                                ] })] }) })) : (_jsx(DataTable, { data: filteredRows, columns: tableColumns, getRowId: row => row.id, onSort: () => {
                        // Sorting is managed by backend defaults for now.
                    }, rowActions: row => (_jsxs("div", { className: "flex justify-end gap-2", children: [_jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-2 py-1 text-xs", onClick: () => setInfoRow(row), children: "Info" }), _jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-2 py-1 text-xs", onClick: () => {
                                    setIsAddModalOpen(false);
                                    setEditing(row);
                                }, children: "Edit" }), _jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-2 py-1 text-xs", onClick: () => testMutation.mutate(row.id), children: "Test" }), _jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-2 py-1 text-xs", onClick: () => cloneMutation.mutate(row.id), children: "Clone" }), _jsx("button", { type: "button", className: "rounded-sm border border-status-error/60 px-2 py-1 text-xs text-status-error", onClick: () => deleteMutation.mutate(row.id), children: "Delete" })] })) })) }), _jsx(AddIndexerModal, { isOpen: isAddModalOpen, presets: addIndexerPresets, appProfiles: appProfilesQuery.data?.map((profile) => ({ id: profile.id, name: profile.name })) ?? [], isSubmitting: createMutation.isPending, onClose: () => setIsAddModalOpen(false), onCreate: handleCreateFromModal, onTestConnection: handleDraftConnectionTest }), editing ? (_jsx(EditIndexerModal, { isOpen: true, indexer: editing, appProfiles: appProfilesQuery.data?.map((profile) => ({ id: profile.id, name: profile.name })) ?? [], isSubmitting: editMutation.isPending, onClose: () => setEditing(null), onSave: handleEditFromModal }, editing.id)) : null, _jsx(FilterBuilder, { isOpen: isFilterBuilderOpen, targetType: "indexer", activeFilter: activeFilterForBuilder, onClose: () => setIsFilterBuilderOpen(false), onApply: conditions => {
                    setSelectedFilterId('custom');
                    setCustomFilter(conditions);
                    setIsFilterBuilderOpen(false);
                }, onSave: async ({ id, name, conditions }) => {
                    if (id) {
                        await api.filtersApi.update(id, { name, conditions });
                    }
                    else {
                        const created = await api.filtersApi.create({ name, type: 'indexer', conditions });
                        setSelectedFilterId(created.id);
                        setCustomFilter(null);
                    }
                    await queryClient.invalidateQueries({ queryKey: queryKeys.filtersList('indexer') });
                    pushToast({ title: 'Filter saved', variant: 'success' });
                    setIsFilterBuilderOpen(false);
                }, onDelete: async (id) => {
                    await api.filtersApi.delete(id);
                    await queryClient.invalidateQueries({ queryKey: queryKeys.filtersList('indexer') });
                    setSelectedFilterId(null);
                    setCustomFilter(null);
                    setIsFilterBuilderOpen(false);
                    pushToast({ title: 'Filter deleted', variant: 'success' });
                } }), _jsxs(Modal, { isOpen: Boolean(infoRow), ariaLabel: "Indexer information", onClose: () => setInfoRow(null), children: [_jsx(ModalHeader, { title: "Indexer Information", onClose: () => {
                            setInfoRow(null);
                        } }), infoRow ? (_jsx(ModalBody, { children: _jsxs("div", { className: "space-y-4", children: [_jsx("h3", { className: "text-base font-semibold", children: infoRow.name }), _jsxs("dl", { className: "grid grid-cols-1 gap-3 text-sm md:grid-cols-2", children: [_jsxs("div", { children: [_jsx("dt", { className: "text-xs uppercase tracking-wide text-text-secondary", children: "Protocol" }), _jsx("dd", { children: infoRow.protocol })] }), _jsxs("div", { children: [_jsx("dt", { className: "text-xs uppercase tracking-wide text-text-secondary", children: "Implementation" }), _jsx("dd", { children: infoRow.implementation })] }), _jsxs("div", { children: [_jsx("dt", { className: "text-xs uppercase tracking-wide text-text-secondary", children: "Capabilities" }), _jsx("dd", { children: [
                                                        infoRow.supportsRss ? 'RSS' : null,
                                                        infoRow.supportsSearch ? 'Search' : null,
                                                    ]
                                                        .filter((value) => Boolean(value))
                                                        .join(', ') || 'None' })] }), _jsxs("div", { children: [_jsx("dt", { className: "text-xs uppercase tracking-wide text-text-secondary", children: "Privacy" }), _jsx("dd", { children: getIndexerPrivacy(infoRow) ?? 'Unknown' })] }), _jsxs("div", { children: [_jsx("dt", { className: "text-xs uppercase tracking-wide text-text-secondary", children: "Categories" }), _jsx("dd", { children: getIndexerCategories(infoRow).join(', ') || 'None' })] }), _jsxs("div", { children: [_jsx("dt", { className: "text-xs uppercase tracking-wide text-text-secondary", children: "Health failures" }), _jsx("dd", { children: String(infoRow.health?.failureCount ?? 0) })] }), _jsxs("div", { className: "md:col-span-2", children: [_jsx("dt", { className: "text-xs uppercase tracking-wide text-text-secondary", children: "Last error" }), _jsx("dd", { children: infoRow.health?.lastErrorMessage ?? 'None' })] })] })] }) })) : null] }), _jsx(ConfirmModal, { isOpen: pendingBulkDeleteIds.length > 0, title: "Delete selected indexers", description: `This will delete ${pendingBulkDeleteIds.length} selected indexers.`, onCancel: () => {
                    setPendingBulkDeleteIds([]);
                }, onConfirm: () => {
                    void handleBulkDelete();
                }, confirmLabel: `Delete ${pendingBulkDeleteIds.length} Indexers`, isConfirming: isBulkDeleting }), _jsxs(Modal, { isOpen: isBulkEditOpen, ariaLabel: "Bulk edit indexers", onClose: () => {
                    setIsBulkEditOpen(false);
                    setBulkEditIds([]);
                }, children: [_jsx(ModalHeader, { title: "Bulk Edit Indexers", onClose: () => {
                            setIsBulkEditOpen(false);
                            setBulkEditIds([]);
                        } }), _jsx(ModalBody, { children: _jsxs("div", { className: "space-y-4", children: [_jsxs("label", { className: "flex items-center gap-2 text-sm", children: [_jsx("input", { type: "checkbox", checked: bulkEditEnabled, onChange: event => {
                                                setBulkEditEnabled(event.currentTarget.checked);
                                            } }), "Enable selected indexers"] }), _jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "Priority" }), _jsx("input", { type: "number", value: bulkEditPriority, onChange: event => {
                                                setBulkEditPriority(event.currentTarget.value);
                                            }, className: "w-24 rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-xs" })] })] }) }), _jsxs(ModalFooter, { children: [_jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-3 py-1 text-sm", onClick: () => {
                                    setIsBulkEditOpen(false);
                                    setBulkEditIds([]);
                                }, disabled: isApplyingBulkEdit, children: "Cancel" }), _jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-3 py-1 text-sm", onClick: () => {
                                    void handleBulkEditApply();
                                }, disabled: isApplyingBulkEdit, children: "Apply Changes" })] })] }), Object.entries(testOutput).length > 0 ? (_jsxs("section", { className: "rounded-lg border border-border-subtle bg-surface-1 p-4", children: [_jsx("h2", { className: "text-lg font-semibold", children: "Latest Diagnostics" }), _jsx("ul", { className: "mt-2 space-y-2 text-sm text-text-secondary", children: Object.entries(testOutput).map(([id, output]) => (_jsxs("li", { children: [_jsxs("p", { className: "font-medium text-text-primary", children: ["Indexer #", id, ": ", output.message] }), _jsx("ul", { className: "list-disc pl-5", children: output.hints.map(hint => (_jsx("li", { children: hint }, hint))) })] }, id))) })] })) : null] }));
}
//# sourceMappingURL=page.js.map