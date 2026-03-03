'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Button } from '@/components/primitives/Button';
import { Alert } from '@/components/primitives/Alert';
import { ConfirmModal } from '@/components/primitives/Modal';
import { ProfileEditorModal } from '@/components/subtitles/ProfileEditorModal';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { useToast } from '@/components/providers/ToastProvider';
import { getLanguageName } from '@/lib/constants/languages';
import { LanguageBadge } from '@/components/subtitles/LanguageBadge';
export default function LanguageProfilesPage() {
    const { pushToast } = useToast();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editProfile, setEditProfile] = useState(undefined);
    const [deleteProfile, setDeleteProfile] = useState(undefined);
    const [isSaving, setIsSaving] = useState(false);
    const { data: profiles = [], isLoading, error, refetch } = useApiQuery({
        queryKey: queryKeys.languageProfiles(),
        queryFn: () => getApiClients().languageProfilesApi.listProfiles(),
    });
    const handleCreateProfile = async (input) => {
        setIsSaving(true);
        try {
            await getApiClients().languageProfilesApi.createProfile(input);
            pushToast({
                title: 'Success',
                message: 'Language profile created successfully',
                variant: 'success',
            });
            setIsModalOpen(false);
            refetch();
        }
        catch (err) {
            pushToast({
                title: 'Error',
                message: 'Failed to create language profile',
                variant: 'error',
            });
        }
        finally {
            setIsSaving(false);
        }
    };
    const handleUpdateProfile = async (input) => {
        if (!editProfile)
            return;
        setIsSaving(true);
        try {
            await getApiClients().languageProfilesApi.updateProfile(editProfile.id, input);
            pushToast({
                title: 'Success',
                message: 'Language profile updated successfully',
                variant: 'success',
            });
            setIsModalOpen(false);
            setEditProfile(undefined);
            refetch();
        }
        catch (err) {
            pushToast({
                title: 'Error',
                message: 'Failed to update language profile',
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
            await getApiClients().languageProfilesApi.deleteProfile(deleteProfile.id);
            pushToast({
                title: 'Success',
                message: 'Language profile deleted successfully',
                variant: 'success',
            });
            setDeleteProfile(undefined);
            refetch();
        }
        catch (err) {
            pushToast({
                title: 'Error',
                message: 'Failed to delete language profile',
                variant: 'error',
            });
        }
        finally {
            setIsSaving(false);
        }
    };
    const openAddModal = () => {
        setEditProfile(undefined);
        setIsModalOpen(true);
    };
    const openEditModal = (profile) => {
        setEditProfile(profile);
        setIsModalOpen(true);
    };
    const closeModals = () => {
        setIsModalOpen(false);
        setEditProfile(undefined);
        setDeleteProfile(undefined);
    };
    const formatLanguages = (languages) => {
        return languages.map(lang => (_jsx(LanguageBadge, { languageCode: lang.languageCode, variant: "available", isForced: lang.isForced, isHi: lang.isHi, className: "mr-1" }, lang.languageCode)));
    };
    const formatCutoff = (profile) => {
        if (!profile.cutoff)
            return 'None';
        const lang = profile.languages.find(l => l.languageCode === profile.cutoff);
        if (!lang)
            return profile.cutoff;
        return `${getLanguageName(lang.languageCode)} (${lang.languageCode})`;
    };
    return (_jsxs("section", { className: "space-y-5", children: [_jsxs("header", { className: "space-y-1", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "Language Profiles" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Manage language profiles for controlling subtitle download preferences and quality settings." })] }), _jsx("div", { children: _jsx(Button, { variant: "primary", onClick: openAddModal, children: "Add New Profile" }) }), error && (_jsx(Alert, { variant: "danger", children: _jsx("p", { children: "Failed to load language profiles. Please try again later." }) })), isLoading && (_jsx("div", { className: "rounded-sm border border-border-subtle bg-surface-1 p-4", children: _jsx("p", { className: "text-sm text-text-secondary", children: "Loading language profiles..." }) })), !isLoading && !error && profiles.length === 0 && (_jsx(Alert, { variant: "info", children: _jsx("p", { children: "No language profiles configured. Click \"Add New Profile\" to create one." }) })), !isLoading && !error && profiles.length > 0 && (_jsx("div", { className: "space-y-3", children: profiles.map(profile => (_jsx("div", { className: "rounded-sm border border-border-subtle bg-surface-1 p-4", children: _jsxs("div", { className: "flex items-start justify-between gap-4", children: [_jsxs("div", { className: "flex-1", children: [_jsx("h3", { className: "text-base font-semibold text-text-primary", children: profile.name }), _jsxs("div", { className: "mt-3 space-y-2 text-sm", children: [_jsxs("div", { className: "flex flex-wrap gap-y-1", children: [_jsx("span", { className: "text-text-muted", children: "Languages:" }), _jsx("div", { className: "ml-2 flex flex-wrap", children: formatLanguages(profile.languages) })] }), _jsxs("div", { children: [_jsx("span", { className: "text-text-muted", children: "Cutoff:" }), ' ', _jsx("span", { className: "font-medium text-accent-primary", children: formatCutoff(profile) })] }), _jsxs("div", { children: [_jsx("span", { className: "text-text-muted", children: "Upgrade Allowed:" }), ' ', _jsx("span", { className: profile.upgradeAllowed ? 'text-accent-success' : 'text-text-muted', children: profile.upgradeAllowed ? 'Yes' : 'No' })] }), profile.mustContain.length > 0 && (_jsxs("div", { children: [_jsx("span", { className: "text-text-muted", children: "Must Contain:" }), ' ', _jsx("span", { className: "text-text-secondary", children: profile.mustContain.join(', ') })] })), profile.mustNotContain.length > 0 && (_jsxs("div", { children: [_jsx("span", { className: "text-text-muted", children: "Must Not Contain:" }), ' ', _jsx("span", { className: "text-text-secondary", children: profile.mustNotContain.join(', ') })] }))] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { variant: "secondary", onClick: () => openEditModal(profile), className: "text-sm", children: "Edit" }), _jsx(Button, { variant: "danger", onClick: () => setDeleteProfile(profile), className: "text-sm", children: "Delete" })] })] }) }, profile.id))) })), _jsx(ProfileEditorModal, { isOpen: isModalOpen, onClose: closeModals, onSave: editProfile ? handleUpdateProfile : handleCreateProfile, profile: editProfile, isLoading: isSaving }), deleteProfile && (_jsx(ConfirmModal, { isOpen: true, title: "Delete Language Profile", description: _jsxs("div", { className: "space-y-2", children: [_jsxs("p", { children: ["Are you sure you want to delete the language profile", ' ', _jsx("strong", { children: deleteProfile.name }), "?"] }), _jsx("p", { className: "text-xs text-text-muted", children: "This action cannot be undone. Make sure no series or movies are using this profile." })] }), onCancel: () => setDeleteProfile(undefined), onConfirm: handleDeleteProfile, cancelLabel: "Cancel", confirmLabel: "Delete Profile", confirmVariant: "danger", isConfirming: isSaving }))] }));
}
//# sourceMappingURL=page.js.map