'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Button } from '@/components/primitives/Button';
import { ConfirmModal } from '@/components/primitives/Modal';
import { ImportListList } from './ImportListList';
import { ImportListModal } from './ImportListModal';
import { ExclusionManager } from './ExclusionManager';
import { AddExclusionModal } from './AddExclusionModal';
export function ImportListSettings({ lists, exclusions, qualityProfiles, isLoadingLists, isLoadingExclusions, listsError, exclusionsError, onCreateList, onUpdateList, onDeleteList, onSyncList, onCreateExclusion, onDeleteExclusion, onRefreshLists, onRefreshExclusions, title = 'Import Lists', description = 'Configure import lists to automatically add media from external sources.', defaultTab = 'lists', }) {
    const [activeTab, setActiveTab] = useState(defaultTab);
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
    // Create/Update list handler
    const handleSaveList = async (input) => {
        setIsSaving(true);
        try {
            if (editList) {
                await onUpdateList(editList.id, input);
            }
            else {
                await onCreateList(input);
            }
            setIsListModalOpen(false);
            setEditList(undefined);
            onRefreshLists();
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
            await onDeleteList(deleteList.id);
            setDeleteList(undefined);
            onRefreshLists();
        }
        finally {
            setIsSaving(false);
        }
    };
    // Sync list handler
    const handleSyncList = async (list) => {
        setSyncingId(list.id);
        try {
            await onSyncList(list.id);
            onRefreshLists();
        }
        finally {
            setSyncingId(null);
        }
    };
    // Add exclusion handler
    const handleAddExclusion = async (input) => {
        setIsSaving(true);
        try {
            await onCreateExclusion(input);
            setIsExclusionModalOpen(false);
            onRefreshExclusions();
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
            await onDeleteExclusion(deleteExclusion.id);
            setDeleteExclusion(undefined);
            onRefreshExclusions();
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
    return (_jsxs("section", { className: "space-y-5", children: [_jsxs("header", { className: "space-y-1", children: [_jsx("h1", { className: "text-2xl font-semibold", children: title }), _jsx("p", { className: "text-sm text-text-secondary", children: description })] }), _jsxs("div", { className: "flex gap-1 border-b border-border-subtle", children: [_jsx("button", { type: "button", onClick: () => setActiveTab('lists'), className: `px-4 py-2 text-sm font-medium transition ${activeTab === 'lists'
                            ? 'border-b-2 border-accent-primary text-accent-primary'
                            : 'text-text-secondary hover:text-text-primary'}`, children: "Import Lists" }), _jsx("button", { type: "button", onClick: () => setActiveTab('exclusions'), className: `px-4 py-2 text-sm font-medium transition ${activeTab === 'exclusions'
                            ? 'border-b-2 border-accent-primary text-accent-primary'
                            : 'text-text-secondary hover:text-text-primary'}`, children: "Exclusions" })] }), activeTab === 'lists' && (_jsxs(_Fragment, { children: [_jsx("div", { children: _jsx(Button, { variant: "primary", onClick: openAddModal, children: "Add Import List" }) }), _jsx(ImportListList, { lists: lists, isLoading: isLoadingLists, error: listsError, onEdit: openEditModal, onDelete: setDeleteList, onSync: handleSyncList, syncingId: syncingId })] })), activeTab === 'exclusions' && (_jsx(ExclusionManager, { exclusions: exclusions, isLoading: isLoadingExclusions, error: exclusionsError, onAddExclusion: () => setIsExclusionModalOpen(true), onRemoveExclusion: setDeleteExclusion, isDeleting: isDeletingExclusion })), _jsx(ImportListModal, { isOpen: isListModalOpen, onClose: () => {
                    setIsListModalOpen(false);
                    setEditList(undefined);
                }, onSave: handleSaveList, editList: editList, isLoading: isSaving, qualityProfiles: qualityProfiles }), _jsx(AddExclusionModal, { isOpen: isExclusionModalOpen, onClose: () => setIsExclusionModalOpen(false), onAdd: handleAddExclusion, existingExclusions: exclusions, isLoading: isSaving }), deleteList && (_jsx(ConfirmModal, { isOpen: true, title: "Delete Import List", description: _jsxs("div", { className: "space-y-2", children: [_jsxs("p", { children: ["Are you sure you want to delete the import list", ' ', _jsx("strong", { children: deleteList.name }), "?"] }), _jsx("p", { className: "text-xs text-text-muted", children: "This action cannot be undone. The list configuration will be permanently removed." })] }), onCancel: () => setDeleteList(undefined), onConfirm: handleDeleteList, cancelLabel: "Cancel", confirmLabel: "Delete List", confirmVariant: "danger", isConfirming: isSaving })), deleteExclusion && (_jsx(ConfirmModal, { isOpen: true, title: "Remove Exclusion", description: _jsxs("div", { className: "space-y-2", children: [_jsxs("p", { children: ["Are you sure you want to remove the exclusion for", ' ', _jsx("strong", { children: deleteExclusion.title }), "?"] }), _jsx("p", { className: "text-xs text-text-muted", children: "This item will be eligible for automatic import again if it appears in any import list." })] }), onCancel: () => setDeleteExclusion(undefined), onConfirm: handleDeleteExclusion, cancelLabel: "Cancel", confirmLabel: "Remove Exclusion", confirmVariant: "danger", isConfirming: isDeletingExclusion }))] }));
}
//# sourceMappingURL=ImportListSettings.js.map