'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Button } from '@/components/primitives/Button';
import { Alert } from '@/components/primitives/Alert';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/primitives/Modal';
const PROVIDER_TYPES = [
    { value: 'tmdb-popular', label: 'TMDB Popular' },
    { value: 'tmdb-list', label: 'TMDB List' },
];
const MEDIA_TYPES = [
    { value: 'movie', label: 'Movies' },
    { value: 'series', label: 'TV Series' },
    { value: 'both', label: 'Both' },
];
const MONITOR_TYPES = [
    { value: 'movie', label: 'Movie Only' },
    { value: 'collection', label: 'Collection' },
    { value: 'none', label: 'None' },
];
const DEFAULT_TMDB_POPULAR_CONFIG = {
    mediaType: 'movie',
    limit: 20,
};
const DEFAULT_TMDB_LIST_CONFIG = {
    listId: '',
};
export function ImportListModal({ isOpen, onClose, onSave, editList, isLoading = false, qualityProfiles, }) {
    const [name, setName] = useState('');
    const [providerType, setProviderType] = useState('tmdb-popular');
    const [enabled, setEnabled] = useState(true);
    const [rootFolderPath, setRootFolderPath] = useState('');
    const [qualityProfileId, setQualityProfileId] = useState();
    const [monitorType, setMonitorType] = useState('movie');
    const [syncInterval, setSyncInterval] = useState(24);
    // TMDB Popular config
    const [tmdbPopularMediaType, setTmdbPopularMediaType] = useState('movie');
    const [tmdbPopularLimit, setTmdbPopularLimit] = useState(20);
    // TMDB List config
    const [tmdbListId, setTmdbListId] = useState('');
    // Reset form when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            if (editList) {
                setName(editList.name);
                setProviderType(editList.providerType);
                setEnabled(editList.enabled);
                setRootFolderPath(editList.rootFolderPath);
                setQualityProfileId(editList.qualityProfileId);
                setMonitorType(editList.monitorType);
                setSyncInterval(editList.syncInterval);
                // Parse provider-specific config
                const config = editList.config;
                if (editList.providerType === 'tmdb-popular') {
                    setTmdbPopularMediaType(config.mediaType ?? 'movie');
                    setTmdbPopularLimit(config.limit ?? 20);
                }
                else if (editList.providerType === 'tmdb-list') {
                    setTmdbListId(config.listId ?? '');
                }
            }
            else {
                // Reset to defaults
                setName('');
                setProviderType('tmdb-popular');
                setEnabled(true);
                setRootFolderPath('');
                setQualityProfileId(qualityProfiles[0]?.id);
                setMonitorType('movie');
                setSyncInterval(24);
                setTmdbPopularMediaType('movie');
                setTmdbPopularLimit(20);
                setTmdbListId('');
            }
        }
    }, [isOpen, editList, qualityProfiles]);
    const handleSave = async () => {
        if (!name.trim() || !rootFolderPath.trim() || !qualityProfileId) {
            return;
        }
        // Build provider-specific config
        let config;
        if (providerType === 'tmdb-popular') {
            config = {
                mediaType: tmdbPopularMediaType,
                limit: tmdbPopularLimit,
            };
        }
        else if (providerType === 'tmdb-list') {
            config = {
                listId: tmdbListId,
            };
        }
        else {
            config = {};
        }
        const input = {
            name: name.trim(),
            providerType,
            config,
            rootFolderPath: rootFolderPath.trim(),
            qualityProfileId,
            monitorType,
            enabled,
            syncInterval,
        };
        await onSave(input);
    };
    const canSave = name.trim() !== '' && rootFolderPath.trim() !== '' && qualityProfileId !== undefined;
    const renderProviderConfig = () => {
        if (providerType === 'tmdb-popular') {
            return (_jsxs("div", { className: "space-y-3 rounded-sm border border-border-subtle bg-surface-0 p-3", children: [_jsx("h4", { className: "text-sm font-medium", children: "TMDB Popular Settings" }), _jsxs("div", { className: "grid gap-3 md:grid-cols-2", children: [_jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "Media Type" }), _jsx("select", { className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm", value: tmdbPopularMediaType, onChange: (e) => setTmdbPopularMediaType(e.target.value), children: MEDIA_TYPES.map((type) => (_jsx("option", { value: type.value, children: type.label }, type.value))) })] }), _jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "Limit" }), _jsx("input", { type: "number", min: 1, max: 100, className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm", value: tmdbPopularLimit, onChange: (e) => setTmdbPopularLimit(parseInt(e.target.value, 10) || 20) }), _jsx("span", { className: "text-xs text-text-muted", children: "Max items to import (1-100)" })] })] })] }));
        }
        if (providerType === 'tmdb-list') {
            return (_jsxs("div", { className: "space-y-3 rounded-sm border border-border-subtle bg-surface-0 p-3", children: [_jsx("h4", { className: "text-sm font-medium", children: "TMDB List Settings" }), _jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "List ID" }), _jsx("input", { type: "text", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm", placeholder: "e.g., 1, 706, or list slug", value: tmdbListId, onChange: (e) => setTmdbListId(e.target.value) }), _jsx("span", { className: "text-xs text-text-muted", children: "Enter the TMDB list ID or slug from the list URL" })] })] }));
        }
        return null;
    };
    return (_jsxs(Modal, { isOpen: isOpen, ariaLabel: editList ? 'Edit Import List' : 'Add Import List', onClose: onClose, maxWidthClassName: "max-w-2xl", children: [_jsx(ModalHeader, { title: editList ? 'Edit Import List' : 'Add Import List', onClose: onClose }), _jsx(ModalBody, { children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsxs("label", { htmlFor: "list-name", className: "block text-sm font-medium text-text-primary", children: ["Name ", _jsx("span", { className: "text-accent-danger", children: "*" })] }), _jsx("input", { id: "list-name", type: "text", className: "mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm outline-none focus:border-accent-primary", placeholder: "e.g., TMDB Top Movies", value: name, onChange: (e) => setName(e.target.value) })] }), _jsxs("div", { children: [_jsxs("label", { htmlFor: "provider-type", className: "block text-sm font-medium text-text-primary", children: ["Provider Type ", _jsx("span", { className: "text-accent-danger", children: "*" })] }), _jsx("select", { id: "provider-type", className: "mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm outline-none focus:border-accent-primary", value: providerType, onChange: (e) => setProviderType(e.target.value), children: PROVIDER_TYPES.map((type) => (_jsx("option", { value: type.value, children: type.label }, type.value))) })] }), renderProviderConfig(), _jsxs("div", { children: [_jsxs("label", { htmlFor: "root-folder", className: "block text-sm font-medium text-text-primary", children: ["Root Folder Path ", _jsx("span", { className: "text-accent-danger", children: "*" })] }), _jsx("input", { id: "root-folder", type: "text", className: "mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm outline-none focus:border-accent-primary", placeholder: "e.g., /movies", value: rootFolderPath, onChange: (e) => setRootFolderPath(e.target.value) })] }), _jsxs("div", { children: [_jsxs("label", { htmlFor: "quality-profile", className: "block text-sm font-medium text-text-primary", children: ["Quality Profile ", _jsx("span", { className: "text-accent-danger", children: "*" })] }), _jsxs("select", { id: "quality-profile", className: "mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm outline-none focus:border-accent-primary", value: qualityProfileId ?? '', onChange: (e) => setQualityProfileId(e.target.value ? parseInt(e.target.value, 10) : undefined), children: [_jsx("option", { value: "", children: "Select a profile" }), qualityProfiles.map((profile) => (_jsx("option", { value: profile.id, children: profile.name }, profile.id)))] })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "monitor-type", className: "block text-sm font-medium text-text-primary", children: "Monitor Type" }), _jsx("select", { id: "monitor-type", className: "mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm outline-none focus:border-accent-primary", value: monitorType, onChange: (e) => setMonitorType(e.target.value), children: MONITOR_TYPES.map((type) => (_jsx("option", { value: type.value, children: type.label }, type.value))) }), _jsx("p", { className: "mt-1 text-xs text-text-muted", children: "Determines how items from this list are monitored" })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "sync-interval", className: "block text-sm font-medium text-text-primary", children: "Sync Interval (hours)" }), _jsx("input", { id: "sync-interval", type: "number", min: 1, max: 168, className: "mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm outline-none focus:border-accent-primary", value: syncInterval, onChange: (e) => setSyncInterval(parseInt(e.target.value, 10) || 24) }), _jsx("p", { className: "mt-1 text-xs text-text-muted", children: "How often to sync this list (1-168 hours)" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { id: "enabled", type: "checkbox", className: "h-4 w-4 rounded border-border-subtle", checked: enabled, onChange: (e) => setEnabled(e.target.checked) }), _jsx("label", { htmlFor: "enabled", className: "text-sm text-text-primary", children: "Enable this import list" })] }), !canSave && (_jsx(Alert, { variant: "warning", children: "Please fill in all required fields (Name, Root Folder Path, Quality Profile)." }))] }) }), _jsxs(ModalFooter, { children: [_jsx(Button, { variant: "secondary", onClick: onClose, disabled: isLoading, children: "Cancel" }), _jsx(Button, { variant: "primary", onClick: handleSave, disabled: !canSave || isLoading, children: isLoading ? 'Saving...' : editList ? 'Save Changes' : 'Add Import List' })] })] }));
}
//# sourceMappingURL=ImportListModal.js.map