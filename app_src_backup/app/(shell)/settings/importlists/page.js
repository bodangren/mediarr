'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Button } from '@/components/primitives/Button';
import { ConfirmModal } from '@/components/primitives/Modal';
import { ImportListList } from '@/components/importlists/ImportListList';
import { ImportListModal } from '@/components/importlists/ImportListModal';
import { ExclusionManager } from '@/components/importlists/ExclusionManager';
import { AddExclusionModal } from '@/components/importlists/AddExclusionModal';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { useToast } from '@/components/providers/ToastProvider';
export default function ImportListsSettingsPage() {
    const { pushToast } = useToast();
    const [activeTab, setActiveTab] = useState('lists');
    // Modals state
    const [isListModalOpen, setIsListModalOpen] = useState(false);
    const [isExclusionModalOpen, setIsExclusionModalOpen] = useState(false);
    const [deleteList, setDeleteList] = useState();
    const [deleteExclusion, setDeleteExclusion] = useState();
    const [editList, setEditList] = useState();
    // Loading states
    const [isSaving, setIsSaving] = useState(false);
    const [syncingId, setSyncingId] = useState(null);
    const [isDeletingExclusion, setIsDeletingExclusion] = useState(false);
    // Fetch import lists
    const { data: lists = [], isLoading: isLoadingLists, error: listsError, refetch: refetchLists, } = useApiQuery({
        queryKey: queryKeys.importLists(),
        queryFn: () => getApiClients().importListsApi.list(),
    });
    // Fetch exclusions
    const { data: exclusions = [], isLoading: isLoadingExclusions, error: exclusionsError, refetch: refetchExclusions, } = useApiQuery({
        queryKey: queryKeys.importListExclusions(),
        queryFn: () => getApiClients().importListsApi.listExclusions(),
    });
    // Fetch quality profiles
    const { data: qualityProfiles = [], } = useApiQuery({
        queryKey: queryKeys.qualityProfiles(),
        queryFn: () => getApiClients().qualityProfileApi.list(),
    });
    // Create/Update list handler
    const handleSaveList = async (input) => {
        setIsSaving(true);
        try {
            if (editList) {
                await getApiClients().importListsApi.update(editList.id, input);
                pushToast({
                    title: 'Success',
                    message: 'Import list updated successfully',
                    variant: 'success',
                });
            }
            else {
                await getApiClients().importListsApi.create(input);
                pushToast({
                    title: 'Success',
                    message: 'Import list created successfully',
                    variant: 'success',
                });
            }
            setIsListModalOpen(false);
            setEditList(undefined);
            refetchLists();
        }
        catch (error) {
            pushToast({
                title: 'Error',
                message: editList ? 'Failed to update import list' : 'Failed to create import list',
                variant: 'error',
            });
            console.error('Save list error:', error);
        }
        finally {
            setIsSaving(false);
        }
    };
    // Delete list handler
    const handleDeleteList = async () => {
        if (!deleteList)
            return;
        setIsSaving(true);
        try {
            await getApiClients().importListsApi.delete(deleteList.id);
            pushToast({
                title: 'Success',
                message: 'Import list deleted successfully',
                variant: 'success',
            });
            setDeleteList(undefined);
            refetchLists();
        }
        catch (error) {
            pushToast({
                title: 'Error',
                message: 'Failed to delete import list',
                variant: 'error',
            });
            console.error('Delete list error:', error);
        }
        finally {
            setIsSaving(false);
        }
    };
    // Sync list handler
    const handleSyncList = async (list) => {
        setSyncingId(list.id);
        try {
            const result = await getApiClients().importListsApi.sync(list.id);
            pushToast({
                title: 'Sync Complete',
                message: `Added ${result.addedCount} items, skipped ${result.skippedCount}${result.errorCount ? `, ${result.errorCount} errors` : ''}`,
                variant: result.success ? 'success' : 'warning',
            });
            refetchLists();
        }
        catch (error) {
            pushToast({
                title: 'Sync Failed',
                message: 'Failed to sync import list',
                variant: 'error',
            });
            console.error('Sync error:', error);
        }
        finally {
            setSyncingId(null);
        }
    };
    // Add exclusion handler
    const handleAddExclusion = async (input) => {
        setIsSaving(true);
        try {
            await getApiClients().importListsApi.createExclusion(input);
            pushToast({
                title: 'Success',
                message: 'Exclusion added successfully',
                variant: 'success',
            });
            setIsExclusionModalOpen(false);
            refetchExclusions();
        }
        catch (error) {
            pushToast({
                title: 'Error',
                message: 'Failed to add exclusion',
                variant: 'error',
            });
            console.error('Add exclusion error:', error);
        }
        finally {
            setIsSaving(false);
        }
    };
    // Delete exclusion handler
    const handleDeleteExclusion = async () => {
        if (!deleteExclusion)
            return;
        setIsDeletingExclusion(true);
        try {
            await getApiClients().importListsApi.deleteExclusion(deleteExclusion.id);
            pushToast({
                title: 'Success',
                message: 'Exclusion removed successfully',
                variant: 'success',
            });
            setDeleteExclusion(undefined);
            refetchExclusions();
        }
        catch (error) {
            pushToast({
                title: 'Error',
                message: 'Failed to remove exclusion',
                variant: 'error',
            });
            console.error('Delete exclusion error:', error);
        }
        finally {
            setIsDeletingExclusion(false);
        }
    };
    const openAddModal = () => {
        setEditList(undefined);
        setIsListModalOpen(true);
    };
    const openEditModal = (list) => {
        setEditList(list);
        setIsListModalOpen(true);
    };
    return (_jsxs("section", { className: "space-y-5", children: [_jsxs("header", { className: "space-y-1", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "Import Lists" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Configure import lists to automatically add movies and series from external sources." })] }), _jsxs("div", { className: "flex gap-1 border-b border-border-subtle", children: [_jsx("button", { type: "button", onClick: () => setActiveTab('lists'), className: `px-4 py-2 text-sm font-medium transition ${activeTab === 'lists'
                            ? 'border-b-2 border-accent-primary text-accent-primary'
                            : 'text-text-secondary hover:text-text-primary'}`, children: "Import Lists" }), _jsx("button", { type: "button", onClick: () => setActiveTab('exclusions'), className: `px-4 py-2 text-sm font-medium transition ${activeTab === 'exclusions'
                            ? 'border-b-2 border-accent-primary text-accent-primary'
                            : 'text-text-secondary hover:text-text-primary'}`, children: "Exclusions" })] }), activeTab === 'lists' && (_jsxs(_Fragment, { children: [_jsx("div", { children: _jsx(Button, { variant: "primary", onClick: openAddModal, children: "Add Import List" }) }), _jsx(ImportListList, { lists: lists, isLoading: isLoadingLists, error: listsError, onEdit: openEditModal, onDelete: setDeleteList, onSync: handleSyncList, syncingId: syncingId })] })), activeTab === 'exclusions' && (_jsx(ExclusionManager, { exclusions: exclusions, isLoading: isLoadingExclusions, error: exclusionsError, onAddExclusion: () => setIsExclusionModalOpen(true), onRemoveExclusion: setDeleteExclusion, isDeleting: isDeletingExclusion })), _jsx(ImportListModal, { isOpen: isListModalOpen, onClose: () => {
                    setIsListModalOpen(false);
                    setEditList(undefined);
                }, onSave: handleSaveList, editList: editList, isLoading: isSaving, qualityProfiles: qualityProfiles }), _jsx(AddExclusionModal, { isOpen: isExclusionModalOpen, onClose: () => setIsExclusionModalOpen(false), onAdd: handleAddExclusion, existingExclusions: exclusions, isLoading: isSaving }), deleteList && (_jsx(ConfirmModal, { isOpen: true, title: "Delete Import List", description: _jsxs("div", { className: "space-y-2", children: [_jsxs("p", { children: ["Are you sure you want to delete the import list", ' ', _jsx("strong", { children: deleteList.name }), "?"] }), _jsx("p", { className: "text-xs text-text-muted", children: "This action cannot be undone. The list configuration will be permanently removed." })] }), onCancel: () => setDeleteList(undefined), onConfirm: handleDeleteList, cancelLabel: "Cancel", confirmLabel: "Delete List", confirmVariant: "danger", isConfirming: isSaving })), deleteExclusion && (_jsx(ConfirmModal, { isOpen: true, title: "Remove Exclusion", description: _jsxs("div", { className: "space-y-2", children: [_jsxs("p", { children: ["Are you sure you want to remove the exclusion for", ' ', _jsx("strong", { children: deleteExclusion.title }), "?"] }), _jsx("p", { className: "text-xs text-text-muted", children: "This item will be eligible for automatic import again if it appears in any import list." })] }), onCancel: () => setDeleteExclusion(undefined), onConfirm: handleDeleteExclusion, cancelLabel: "Cancel", confirmLabel: "Remove Exclusion", confirmVariant: "danger", isConfirming: isDeletingExclusion }))] }));
}
//# sourceMappingURL=page.js.map