'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Button } from '@/components/primitives/Button';
import { Alert } from '@/components/primitives/Alert';
import { ConfirmModal, Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/primitives/Modal';
import { AddProfileModal } from '@/components/settings/AddProfileModal';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { useToast } from '@/components/providers/ToastProvider';
import { formatQuality, sortQualitiesByRank } from '@/types/qualityProfile';
import { useQueryClient } from '@tanstack/react-query';
function formatCutoff(profile) {
    const cutoff = profile.qualities.find(q => q.id === profile.cutoffId);
    return cutoff ? formatQuality(cutoff) : 'None';
}
function getQualitySummary(profile) {
    if (profile.qualities.length === 0) {
        return 'No qualities';
    }
    const sorted = sortQualitiesByRank(profile.qualities);
    const qualities = sorted.map(formatQuality);
    if (qualities.length <= 3) {
        return qualities.join(', ');
    }
    return `${qualities.slice(0, 3).join(', ')} (+${qualities.length - 3} more)`;
}
function getCustomFormatScoresForProfile(profileId, customFormats) {
    return customFormats
        .map((format) => {
        const matchedScore = format.scores.find(score => score.qualityProfileId === profileId);
        return matchedScore ? { name: format.name, score: matchedScore.score } : null;
    })
        .filter((item) => item !== null);
}
export default function QualityProfilesPage() {
    const { pushToast } = useToast();
    const queryClient = useQueryClient();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editProfile, setEditProfile] = useState(undefined);
    const [deleteProfile, setDeleteProfile] = useState(undefined);
    const [isSaving, setIsSaving] = useState(false);
    const [isAppProfileModalOpen, setIsAppProfileModalOpen] = useState(false);
    const [editingAppProfile, setEditingAppProfile] = useState(null);
    const [deletingAppProfile, setDeletingAppProfile] = useState(null);
    const [appProfileDraft, setAppProfileDraft] = useState({
        name: '',
        enableRss: true,
        enableInteractiveSearch: true,
        enableAutomaticSearch: true,
        minimumSeeders: 0,
    });
    const { data: profiles = [], isLoading, error, refetch } = useApiQuery({
        queryKey: queryKeys.qualityProfiles(),
        queryFn: () => getApiClients().qualityProfileApi.list(),
    });
    const { data: appProfiles = [], isLoading: isAppProfilesLoading } = useApiQuery({
        queryKey: queryKeys.appProfiles(),
        queryFn: () => getApiClients().appProfilesApi.list(),
    });
    const { data: customFormats = [] } = useApiQuery({
        queryKey: queryKeys.customFormats(),
        queryFn: () => getApiClients().customFormatApi.list(),
    });
    const handleAddProfile = async (input) => {
        setIsSaving(true);
        try {
            await getApiClients().qualityProfileApi.create(input);
            pushToast({
                title: 'Success',
                message: 'Quality profile created successfully',
                variant: 'success',
            });
            setIsAddModalOpen(false);
            refetch();
        }
        catch (err) {
            pushToast({
                title: 'Error',
                message: 'Failed to create quality profile',
                variant: 'error',
            });
        }
        finally {
            setIsSaving(false);
        }
    };
    const handleEditProfile = async (input) => {
        if (!editProfile)
            return;
        setIsSaving(true);
        try {
            await getApiClients().qualityProfileApi.update(editProfile.id, input);
            pushToast({
                title: 'Success',
                message: 'Quality profile updated successfully',
                variant: 'success',
            });
            setIsAddModalOpen(false);
            setEditProfile(undefined);
            refetch();
        }
        catch (err) {
            pushToast({
                title: 'Error',
                message: 'Failed to update quality profile',
                variant: 'error',
            });
        }
        finally {
            setIsSaving(false);
        }
    };
    const handleDeleteProfile = async () => {
        if (!deleteProfile)
            return;
        setIsSaving(true);
        try {
            await getApiClients().qualityProfileApi.delete(deleteProfile.id);
            pushToast({
                title: 'Success',
                message: 'Quality profile deleted successfully',
                variant: 'success',
            });
            setDeleteProfile(undefined);
            refetch();
        }
        catch (err) {
            pushToast({
                title: 'Error',
                message: 'Failed to delete quality profile',
                variant: 'error',
            });
        }
        finally {
            setIsSaving(false);
        }
    };
    const openAddModal = () => {
        setEditProfile(undefined);
        setIsAddModalOpen(true);
    };
    const openEditModal = (profile) => {
        setEditProfile(profile);
        setIsAddModalOpen(true);
    };
    const closeModals = () => {
        setIsAddModalOpen(false);
        setEditProfile(undefined);
        setDeleteProfile(undefined);
    };
    const openCreateAppProfile = () => {
        setEditingAppProfile(null);
        setAppProfileDraft({
            name: '',
            enableRss: true,
            enableInteractiveSearch: true,
            enableAutomaticSearch: true,
            minimumSeeders: 0,
        });
        setIsAppProfileModalOpen(true);
    };
    const openEditAppProfile = (profile) => {
        setEditingAppProfile(profile);
        setAppProfileDraft({
            name: profile.name,
            enableRss: profile.enableRss,
            enableInteractiveSearch: profile.enableInteractiveSearch,
            enableAutomaticSearch: profile.enableAutomaticSearch,
            minimumSeeders: profile.minimumSeeders,
        });
        setIsAppProfileModalOpen(true);
    };
    const saveAppProfile = async () => {
        if (!appProfileDraft.name?.trim()) {
            pushToast({ title: 'Validation failed', message: 'Name is required', variant: 'error' });
            return;
        }
        try {
            if (editingAppProfile) {
                await getApiClients().appProfilesApi.update(editingAppProfile.id, appProfileDraft);
                pushToast({ title: 'Profile updated', variant: 'success' });
            }
            else {
                await getApiClients().appProfilesApi.create(appProfileDraft);
                pushToast({ title: 'Profile created', variant: 'success' });
            }
            setIsAppProfileModalOpen(false);
            setEditingAppProfile(null);
            await queryClient.invalidateQueries({ queryKey: queryKeys.appProfiles() });
        }
        catch (err) {
            pushToast({ title: 'Save failed', message: 'Could not save app profile', variant: 'error' });
        }
    };
    const cloneAppProfile = async (profile) => {
        try {
            await getApiClients().appProfilesApi.clone(profile.id);
            pushToast({ title: 'Profile cloned', variant: 'success' });
            await queryClient.invalidateQueries({ queryKey: queryKeys.appProfiles() });
        }
        catch {
            pushToast({ title: 'Clone failed', variant: 'error' });
        }
    };
    const deleteAppProfile = async () => {
        if (!deletingAppProfile) {
            return;
        }
        try {
            await getApiClients().appProfilesApi.remove(deletingAppProfile.id);
            setDeletingAppProfile(null);
            pushToast({ title: 'Profile deleted', variant: 'success' });
            await queryClient.invalidateQueries({ queryKey: queryKeys.appProfiles() });
        }
        catch {
            pushToast({ title: 'Delete failed', variant: 'error' });
        }
    };
    return (_jsxs("section", { className: "space-y-5", children: [_jsxs("header", { className: "space-y-1", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "Quality Profiles" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Manage quality profiles for controlling download quality preferences." })] }), _jsx("div", { children: _jsx(Button, { variant: "primary", onClick: openAddModal, children: "Add New Profile" }) }), error && (_jsx(Alert, { variant: "danger", children: _jsx("p", { children: "Failed to load quality profiles. Please try again later." }) })), isLoading && (_jsx("div", { className: "rounded-sm border border-border-subtle bg-surface-1 p-4", children: _jsx("p", { className: "text-sm text-text-secondary", children: "Loading quality profiles..." }) })), !isLoading && !error && profiles.length === 0 && (_jsx(Alert, { variant: "info", children: _jsx("p", { children: "No quality profiles configured. Click \"Add New Profile\" to create one." }) })), !isLoading && !error && profiles.length > 0 && (_jsx("div", { className: "space-y-3", children: profiles.map(profile => (_jsx("div", { className: "rounded-sm border border-border-subtle bg-surface-1 p-4", children: _jsxs("div", { className: "flex items-start justify-between gap-4", children: [_jsxs("div", { className: "flex-1", children: [_jsx("h3", { className: "text-base font-semibold text-text-primary", children: profile.name }), _jsxs("div", { className: "mt-2 space-y-1 text-sm", children: [_jsxs("div", { children: [_jsx("span", { className: "text-text-muted", children: "Cutoff:" }), ' ', _jsx("span", { className: "font-medium text-accent-primary", children: formatCutoff(profile) })] }), _jsxs("div", { children: [_jsx("span", { className: "text-text-muted", children: "Qualities:" }), ' ', _jsx("span", { className: "text-text-secondary", children: getQualitySummary(profile) })] }), profile.languageProfileId && (_jsxs("div", { children: [_jsx("span", { className: "text-text-muted", children: "Language Profile:" }), ' ', _jsxs("span", { className: "text-text-secondary", children: ["ID ", profile.languageProfileId] })] }))] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { variant: "secondary", onClick: () => openEditModal(profile), className: "text-sm", children: "Edit" }), _jsx(Button, { variant: "danger", onClick: () => setDeleteProfile(profile), className: "text-sm", children: "Delete" })] })] }) }, profile.id))) })), _jsx(AddProfileModal, { isOpen: isAddModalOpen, onClose: closeModals, onSave: editProfile ? handleEditProfile : handleAddProfile, editProfile: editProfile, customFormatScores: editProfile ? getCustomFormatScoresForProfile(editProfile.id, customFormats) : [], isLoading: isSaving }), deleteProfile && (_jsx(ConfirmModal, { isOpen: true, title: "Delete Quality Profile", description: _jsxs("div", { className: "space-y-2", children: [_jsxs("p", { children: ["Are you sure you want to delete the quality profile ", _jsx("strong", { children: deleteProfile.name }), "?"] }), _jsx("p", { className: "text-xs text-text-muted", children: "This action cannot be undone. Make sure no series or movies are using this profile." })] }), onCancel: () => setDeleteProfile(undefined), onConfirm: handleDeleteProfile, cancelLabel: "Cancel", confirmLabel: "Delete Profile", confirmVariant: "danger", isConfirming: isSaving })), _jsxs("section", { className: "space-y-3 rounded-sm border border-border-subtle bg-surface-1 p-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-base font-semibold", children: "App Profiles" }), _jsx("p", { className: "text-xs text-text-secondary", children: "Configure indexer-level RSS/search profile behavior." })] }), _jsx(Button, { onClick: openCreateAppProfile, children: "Add App Profile" })] }), isAppProfilesLoading ? (_jsx("p", { className: "text-sm text-text-secondary", children: "Loading app profiles..." })) : null, !isAppProfilesLoading && appProfiles.length === 0 ? (_jsx(Alert, { variant: "info", children: _jsx("p", { children: "No app profiles configured yet." }) })) : null, appProfiles.map((profile) => (_jsx("div", { className: "rounded-sm border border-border-subtle bg-surface-0 p-3", children: _jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "font-medium", children: profile.name }), _jsxs("p", { className: "text-xs text-text-muted", children: ["RSS: ", profile.enableRss ? 'On' : 'Off', " | Interactive: ", profile.enableInteractiveSearch ? 'On' : 'Off', " | Automatic: ", profile.enableAutomaticSearch ? 'On' : 'Off', " | Min Seeders: ", profile.minimumSeeders] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { variant: "secondary", className: "text-xs", onClick: () => openEditAppProfile(profile), children: "Edit" }), _jsx(Button, { variant: "secondary", className: "text-xs", onClick: () => cloneAppProfile(profile), children: "Clone" }), _jsx(Button, { variant: "danger", className: "text-xs", onClick: () => setDeletingAppProfile(profile), children: "Delete" })] })] }) }, profile.id)))] }), _jsxs(Modal, { isOpen: isAppProfileModalOpen, ariaLabel: "App profile modal", onClose: () => setIsAppProfileModalOpen(false), maxWidthClassName: "max-w-lg", children: [_jsx(ModalHeader, { title: editingAppProfile ? 'Edit App Profile' : 'Add App Profile', onClose: () => setIsAppProfileModalOpen(false) }), _jsx(ModalBody, { children: _jsxs("div", { className: "space-y-3", children: [_jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "Name" }), _jsx("input", { type: "text", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2", value: appProfileDraft.name ?? '', onChange: (event) => setAppProfileDraft((current) => ({ ...current, name: event.target.value })) })] }), _jsxs("label", { className: "flex items-center gap-2 text-sm", children: [_jsx("input", { type: "checkbox", checked: Boolean(appProfileDraft.enableRss), onChange: (event) => setAppProfileDraft((current) => ({ ...current, enableRss: event.target.checked })) }), "Enable RSS"] }), _jsxs("label", { className: "flex items-center gap-2 text-sm", children: [_jsx("input", { type: "checkbox", checked: Boolean(appProfileDraft.enableInteractiveSearch), onChange: (event) => setAppProfileDraft((current) => ({ ...current, enableInteractiveSearch: event.target.checked })) }), "Enable Interactive Search"] }), _jsxs("label", { className: "flex items-center gap-2 text-sm", children: [_jsx("input", { type: "checkbox", checked: Boolean(appProfileDraft.enableAutomaticSearch), onChange: (event) => setAppProfileDraft((current) => ({ ...current, enableAutomaticSearch: event.target.checked })) }), "Enable Automatic Search"] }), _jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "Minimum Seeders" }), _jsx("input", { type: "number", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2", value: appProfileDraft.minimumSeeders ?? 0, onChange: (event) => setAppProfileDraft((current) => ({
                                                ...current,
                                                minimumSeeders: Number.parseInt(event.target.value, 10) || 0,
                                            })) })] })] }) }), _jsxs(ModalFooter, { children: [_jsx(Button, { variant: "secondary", onClick: () => setIsAppProfileModalOpen(false), children: "Cancel" }), _jsx(Button, { variant: "primary", onClick: () => { void saveAppProfile(); }, children: "Save" })] })] }), _jsx(ConfirmModal, { isOpen: deletingAppProfile !== null, title: "Delete app profile", description: `Delete ${deletingAppProfile?.name ?? 'app profile'}?`, onCancel: () => setDeletingAppProfile(null), onConfirm: () => { void deleteAppProfile(); }, confirmLabel: "Delete", confirmVariant: "danger" })] }));
}
//# sourceMappingURL=page.js.map