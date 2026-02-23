'use client';

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
import type { ImportList, ImportListExclusion, CreateImportListInput, CreateExclusionInput } from '@/lib/api/importListsApi';
import type { QualityProfile } from '@/types/qualityProfile';

type TabType = 'lists' | 'exclusions';

export default function ImportListsSettingsPage() {
  const { pushToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('lists');

  // Modals state
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [isExclusionModalOpen, setIsExclusionModalOpen] = useState(false);
  const [deleteList, setDeleteList] = useState<ImportList | undefined>();
  const [deleteExclusion, setDeleteExclusion] = useState<ImportListExclusion | undefined>();
  const [editList, setEditList] = useState<ImportList | undefined>();

  // Loading states
  const [isSaving, setIsSaving] = useState(false);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [isDeletingExclusion, setIsDeletingExclusion] = useState(false);

  // Fetch import lists
  const {
    data: lists = [],
    isLoading: isLoadingLists,
    error: listsError,
    refetch: refetchLists,
  } = useApiQuery<ImportList[]>({
    queryKey: queryKeys.importLists(),
    queryFn: () => getApiClients().importListsApi.list(),
  });

  // Fetch exclusions
  const {
    data: exclusions = [],
    isLoading: isLoadingExclusions,
    error: exclusionsError,
    refetch: refetchExclusions,
  } = useApiQuery<ImportListExclusion[]>({
    queryKey: queryKeys.importListExclusions(),
    queryFn: () => getApiClients().importListsApi.listExclusions(),
  });

  // Fetch quality profiles
  const {
    data: qualityProfiles = [],
  } = useApiQuery<QualityProfile[]>({
    queryKey: queryKeys.qualityProfiles(),
    queryFn: () => getApiClients().qualityProfileApi.list(),
  });

  // Create/Update list handler
  const handleSaveList = async (input: CreateImportListInput) => {
    setIsSaving(true);
    try {
      if (editList) {
        await getApiClients().importListsApi.update(editList.id, input);
        pushToast({
          title: 'Success',
          message: 'Import list updated successfully',
          variant: 'success',
        });
      } else {
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
    } catch (error) {
      pushToast({
        title: 'Error',
        message: editList ? 'Failed to update import list' : 'Failed to create import list',
        variant: 'error',
      });
      console.error('Save list error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete list handler
  const handleDeleteList = async () => {
    if (!deleteList) return;

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
    } catch (error) {
      pushToast({
        title: 'Error',
        message: 'Failed to delete import list',
        variant: 'error',
      });
      console.error('Delete list error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Sync list handler
  const handleSyncList = async (list: ImportList) => {
    setSyncingId(list.id);
    try {
      const result = await getApiClients().importListsApi.sync(list.id);
      pushToast({
        title: 'Sync Complete',
        message: `Added ${result.addedCount} items, skipped ${result.skippedCount}${result.errorCount ? `, ${result.errorCount} errors` : ''}`,
        variant: result.success ? 'success' : 'warning',
      });
      refetchLists();
    } catch (error) {
      pushToast({
        title: 'Sync Failed',
        message: 'Failed to sync import list',
        variant: 'error',
      });
      console.error('Sync error:', error);
    } finally {
      setSyncingId(null);
    }
  };

  // Add exclusion handler
  const handleAddExclusion = async (input: CreateExclusionInput) => {
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
    } catch (error) {
      pushToast({
        title: 'Error',
        message: 'Failed to add exclusion',
        variant: 'error',
      });
      console.error('Add exclusion error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete exclusion handler
  const handleDeleteExclusion = async () => {
    if (!deleteExclusion) return;

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
    } catch (error) {
      pushToast({
        title: 'Error',
        message: 'Failed to remove exclusion',
        variant: 'error',
      });
      console.error('Delete exclusion error:', error);
    } finally {
      setIsDeletingExclusion(false);
    }
  };

  const openAddModal = () => {
    setEditList(undefined);
    setIsListModalOpen(true);
  };

  const openEditModal = (list: ImportList) => {
    setEditList(list);
    setIsListModalOpen(true);
  };

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Import Lists</h1>
        <p className="text-sm text-text-secondary">
          Configure import lists to automatically add movies and series from external sources.
        </p>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border-subtle">
        <button
          type="button"
          onClick={() => setActiveTab('lists')}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === 'lists'
              ? 'border-b-2 border-accent-primary text-accent-primary'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Import Lists
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('exclusions')}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === 'exclusions'
              ? 'border-b-2 border-accent-primary text-accent-primary'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Exclusions
        </button>
      </div>

      {/* Lists Tab */}
      {activeTab === 'lists' && (
        <>
          <div>
            <Button variant="primary" onClick={openAddModal}>
              Add Import List
            </Button>
          </div>
          <ImportListList
            lists={lists}
            isLoading={isLoadingLists}
            error={listsError}
            onEdit={openEditModal}
            onDelete={setDeleteList}
            onSync={handleSyncList}
            syncingId={syncingId}
          />
        </>
      )}

      {/* Exclusions Tab */}
      {activeTab === 'exclusions' && (
        <ExclusionManager
          exclusions={exclusions}
          isLoading={isLoadingExclusions}
          error={exclusionsError}
          onAddExclusion={() => setIsExclusionModalOpen(true)}
          onRemoveExclusion={setDeleteExclusion}
          isDeleting={isDeletingExclusion}
        />
      )}

      {/* Add/Edit List Modal */}
      <ImportListModal
        isOpen={isListModalOpen}
        onClose={() => {
          setIsListModalOpen(false);
          setEditList(undefined);
        }}
        onSave={handleSaveList}
        editList={editList}
        isLoading={isSaving}
        qualityProfiles={qualityProfiles}
      />

      {/* Add Exclusion Modal */}
      <AddExclusionModal
        isOpen={isExclusionModalOpen}
        onClose={() => setIsExclusionModalOpen(false)}
        onAdd={handleAddExclusion}
        existingExclusions={exclusions}
        isLoading={isSaving}
      />

      {/* Delete List Confirmation Modal */}
      {deleteList && (
        <ConfirmModal
          isOpen
          title="Delete Import List"
          description={
            <div className="space-y-2">
              <p>
                Are you sure you want to delete the import list{' '}
                <strong>{deleteList.name}</strong>?
              </p>
              <p className="text-xs text-text-muted">
                This action cannot be undone. The list configuration will be permanently removed.
              </p>
            </div>
          }
          onCancel={() => setDeleteList(undefined)}
          onConfirm={handleDeleteList}
          cancelLabel="Cancel"
          confirmLabel="Delete List"
          confirmVariant="danger"
          isConfirming={isSaving}
        />
      )}

      {/* Delete Exclusion Confirmation Modal */}
      {deleteExclusion && (
        <ConfirmModal
          isOpen
          title="Remove Exclusion"
          description={
            <div className="space-y-2">
              <p>
                Are you sure you want to remove the exclusion for{' '}
                <strong>{deleteExclusion.title}</strong>?
              </p>
              <p className="text-xs text-text-muted">
                This item will be eligible for automatic import again if it appears in any import list.
              </p>
            </div>
          }
          onCancel={() => setDeleteExclusion(undefined)}
          onConfirm={handleDeleteExclusion}
          cancelLabel="Cancel"
          confirmLabel="Remove Exclusion"
          confirmVariant="danger"
          isConfirming={isDeletingExclusion}
        />
      )}
    </section>
  );
}
