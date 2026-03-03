'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/primitives/Button';
import { Modal, ModalBody, ModalHeader, ModalFooter } from '@/components/primitives/Modal';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
const MINIMUM_AVAILABILITY_OPTIONS = [
    { value: 'tba', label: 'TBA' },
    { value: 'announced', label: 'Announced' },
    { value: 'inCinemas', label: 'In Cinemas' },
    { value: 'released', label: 'Released' },
];
const DEFAULT_FORM_STATE = {
    qualityProfileId: '',
    monitored: '',
    minimumAvailability: '',
    path: '',
    addTags: '',
    removeTags: '',
};
export function MovieBulkEditModal({ isOpen, onClose, selectedMovieIds, selectedMovieTitles, }) {
    const api = useMemo(() => getApiClients(), []);
    const queryClient = useQueryClient();
    const { pushToast } = useToast();
    const [formState, setFormState] = useState(DEFAULT_FORM_STATE);
    const [showPreview, setShowPreview] = useState(false);
    // Fetch quality profiles for the dropdown
    const { data: qualityProfilesData } = useQuery({
        queryKey: queryKeys.qualityProfiles(),
        queryFn: () => api.qualityProfileApi.list(),
        enabled: isOpen,
    });
    // Fetch root folders
    const { data: rootFoldersData } = useQuery({
        queryKey: ['movies', 'root-folders'],
        queryFn: () => api.movieApi.getRootFolders(),
        enabled: isOpen,
    });
    const qualityProfiles = qualityProfilesData?.data ?? [];
    const rootFolders = rootFoldersData?.rootFolders ?? [];
    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setFormState(DEFAULT_FORM_STATE);
            setShowPreview(false);
        }
    }, [isOpen]);
    // Build the changes object from form state
    const buildChanges = () => {
        const changes = {};
        if (formState.qualityProfileId !== '') {
            changes.qualityProfileId = parseInt(formState.qualityProfileId, 10);
        }
        if (formState.monitored !== '') {
            changes.monitored = formState.monitored === 'true';
        }
        if (formState.minimumAvailability !== '') {
            changes.minimumAvailability = formState.minimumAvailability;
        }
        if (formState.path !== '') {
            changes.path = formState.path;
        }
        if (formState.addTags !== '') {
            changes.addTags = formState.addTags.split(',').map(t => t.trim()).filter(Boolean);
        }
        if (formState.removeTags !== '') {
            changes.removeTags = formState.removeTags.split(',').map(t => t.trim()).filter(Boolean);
        }
        return changes;
    };
    // Determine if there are any changes
    const hasChanges = () => {
        const changes = buildChanges();
        return Object.keys(changes).length > 0;
    };
    // Get summary of changes for preview
    const getChangesSummary = () => {
        const summary = [];
        const changes = buildChanges();
        if (changes.qualityProfileId !== undefined) {
            const profile = qualityProfiles.find((p) => p.id === changes.qualityProfileId);
            summary.push(`Quality Profile: ${profile?.name ?? changes.qualityProfileId}`);
        }
        if (changes.monitored !== undefined) {
            summary.push(`Monitored: ${changes.monitored ? 'Yes' : 'No'}`);
        }
        if (changes.minimumAvailability !== undefined) {
            const opt = MINIMUM_AVAILABILITY_OPTIONS.find(o => o.value === changes.minimumAvailability);
            summary.push(`Minimum Availability: ${opt?.label ?? changes.minimumAvailability}`);
        }
        if (changes.path !== undefined) {
            summary.push(`Root Folder: ${changes.path}`);
        }
        if (changes.addTags && changes.addTags.length > 0) {
            summary.push(`Add Tags: ${changes.addTags.join(', ')}`);
        }
        if (changes.removeTags && changes.removeTags.length > 0) {
            summary.push(`Remove Tags: ${changes.removeTags.join(', ')}`);
        }
        return summary;
    };
    // Bulk update mutation
    const bulkUpdateMutation = useMutation({
        mutationFn: () => api.movieApi.bulkUpdate(selectedMovieIds, buildChanges()),
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['movies'] });
            if (result.failed > 0) {
                pushToast({
                    title: 'Bulk update completed with errors',
                    message: `${result.updated} movies updated, ${result.failed} failed`,
                    variant: 'warning',
                });
            }
            else {
                pushToast({
                    title: 'Movies updated',
                    message: `${result.updated} movie${result.updated === 1 ? '' : 's'} updated successfully`,
                    variant: 'success',
                });
            }
            onClose();
        },
        onError: (error) => {
            pushToast({
                title: 'Failed to update movies',
                message: error instanceof Error ? error.message : 'An unknown error occurred',
                variant: 'error',
            });
        },
    });
    // Organize files mutation
    const organizeMutation = useMutation({
        mutationFn: () => api.movieApi.applyOrganize({ movieIds: selectedMovieIds }),
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['movies'] });
            if (result.failed > 0) {
                pushToast({
                    title: 'Organize completed with errors',
                    message: `${result.renamed} files renamed, ${result.failed} failed`,
                    variant: 'warning',
                });
            }
            else {
                pushToast({
                    title: 'Files organized',
                    message: `${result.renamed} file${result.renamed === 1 ? '' : 's'} renamed successfully`,
                    variant: 'success',
                });
            }
        },
        onError: (error) => {
            pushToast({
                title: 'Failed to organize files',
                message: error instanceof Error ? error.message : 'An unknown error occurred',
                variant: 'error',
            });
        },
    });
    const handleApply = () => {
        if (showPreview) {
            bulkUpdateMutation.mutate();
        }
        else {
            setShowPreview(true);
        }
    };
    const handleOrganize = () => {
        const confirmed = window.confirm(`Organize files for ${selectedMovieIds.length} movie${selectedMovieIds.length === 1 ? '' : 's'}?\n\nThis will rename files according to your naming settings.`);
        if (confirmed) {
            organizeMutation.mutate();
        }
    };
    const updateField = (field, value) => {
        setFormState(current => ({ ...current, [field]: value }));
        setShowPreview(false);
    };
    return (_jsxs(Modal, { isOpen: isOpen, ariaLabel: "Bulk Edit Movies", onClose: onClose, maxWidthClassName: "max-w-xl", children: [_jsx(ModalHeader, { title: `Edit ${selectedMovieIds.length} Movie${selectedMovieIds.length === 1 ? '' : 's'}`, onClose: onClose }), _jsx(ModalBody, { children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "rounded-sm border border-border-subtle bg-surface-0 p-3", children: [_jsx("p", { className: "text-xs text-text-secondary mb-1", children: "Selected movies:" }), _jsx("p", { className: "text-sm font-medium", children: selectedMovieTitles.length <= 5
                                        ? selectedMovieTitles.join(', ')
                                        : `${selectedMovieTitles.slice(0, 5).join(', ')} and ${selectedMovieTitles.length - 5} more` })] }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "qualityProfileId", className: "block text-sm font-medium mb-1", children: "Quality Profile" }), _jsxs("select", { id: "qualityProfileId", value: formState.qualityProfileId, onChange: e => updateField('qualityProfileId', e.currentTarget.value), className: "w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm", children: [_jsx("option", { value: "", children: "-- No Change --" }), qualityProfiles.map((profile) => (_jsx("option", { value: profile.id, children: profile.name }, profile.id)))] })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "monitored", className: "block text-sm font-medium mb-1", children: "Monitored" }), _jsxs("select", { id: "monitored", value: formState.monitored, onChange: e => updateField('monitored', e.currentTarget.value), className: "w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm", children: [_jsx("option", { value: "", children: "-- No Change --" }), _jsx("option", { value: "true", children: "Yes" }), _jsx("option", { value: "false", children: "No" })] })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "minimumAvailability", className: "block text-sm font-medium mb-1", children: "Minimum Availability" }), _jsxs("select", { id: "minimumAvailability", value: formState.minimumAvailability, onChange: e => updateField('minimumAvailability', e.currentTarget.value), className: "w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm", children: [_jsx("option", { value: "", children: "-- No Change --" }), MINIMUM_AVAILABILITY_OPTIONS.map(opt => (_jsx("option", { value: opt.value, children: opt.label }, opt.value)))] })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "path", className: "block text-sm font-medium mb-1", children: "Root Folder" }), rootFolders.length > 0 ? (_jsxs("select", { id: "path", value: formState.path, onChange: e => updateField('path', e.currentTarget.value), className: "w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm", children: [_jsx("option", { value: "", children: "-- No Change --" }), rootFolders.map(folder => (_jsx("option", { value: folder, children: folder }, folder)))] })) : (_jsx("input", { id: "path", type: "text", value: formState.path, onChange: e => updateField('path', e.currentTarget.value), placeholder: "/movies", className: "w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm" }))] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "addTags", className: "block text-sm font-medium mb-1", children: "Add Tags" }), _jsx("input", { id: "addTags", type: "text", value: formState.addTags, onChange: e => updateField('addTags', e.currentTarget.value), placeholder: "tag1, tag2, ...", className: "w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm" }), _jsx("p", { className: "text-xs text-text-muted mt-1", children: "Comma-separated" })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "removeTags", className: "block text-sm font-medium mb-1", children: "Remove Tags" }), _jsx("input", { id: "removeTags", type: "text", value: formState.removeTags, onChange: e => updateField('removeTags', e.currentTarget.value), placeholder: "tag1, tag2, ...", className: "w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm" }), _jsx("p", { className: "text-xs text-text-muted mt-1", children: "Comma-separated" })] })] })] }), showPreview && hasChanges() && (_jsxs("div", { className: "rounded-sm border border-accent-primary/50 bg-accent-primary/10 p-3", children: [_jsx("p", { className: "text-sm font-medium mb-2", children: "Changes to apply:" }), _jsx("ul", { className: "text-sm space-y-1", children: getChangesSummary().map((item, index) => (_jsxs("li", { className: "flex items-start gap-2", children: [_jsx("span", { className: "text-accent-primary", children: "\u2022" }), item] }, index))) })] })), showPreview && !hasChanges() && (_jsx("div", { className: "rounded-sm border border-status-wanted/50 bg-status-wanted/10 p-3", children: _jsx("p", { className: "text-sm text-status-wanted", children: "No changes selected. Please modify at least one field." }) }))] }) }), _jsxs(ModalFooter, { children: [_jsx("div", { className: "flex items-center gap-2 mr-auto", children: _jsx(Button, { variant: "secondary", onClick: handleOrganize, disabled: organizeMutation.isPending, children: organizeMutation.isPending ? 'Organizing...' : 'Organize Files' }) }), _jsx(Button, { variant: "secondary", onClick: onClose, disabled: bulkUpdateMutation.isPending, children: "Cancel" }), _jsx(Button, { variant: "primary", onClick: handleApply, disabled: bulkUpdateMutation.isPending || (showPreview && !hasChanges()), children: bulkUpdateMutation.isPending
                            ? 'Saving...'
                            : showPreview
                                ? 'Apply Changes'
                                : 'Preview Changes' })] })] }));
}
//# sourceMappingURL=MovieBulkEditModal.js.map