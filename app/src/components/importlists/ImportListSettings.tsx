
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmModal } from '@/components/ui/modal';
import { ImportListList } from './ImportListList';
import { ImportListModal } from './ImportListModal';
import { ExclusionManager } from './ExclusionManager';
import { AddExclusionModal } from './AddExclusionModal';
import type {
  ImportList,
  ImportListExclusion,
  CreateImportListInput,
  UpdateImportListInput,
  CreateExclusionInput,
} from '@/lib/api/importListsApi';
import type { QualityProfile } from '@/types/qualityProfile';

type TabType = 'lists' | 'exclusions';

interface ImportListSettingsProps {
  // Data props
  lists: ImportList[];
  exclusions: ImportListExclusion[];
  qualityProfiles: QualityProfile[];
  
  // Loading states
  isLoadingLists: boolean;
  isLoadingExclusions: boolean;
  listsError: Error | null;
  exclusionsError: Error | null;
  
  // Callbacks
  onCreateList: (input: CreateImportListInput) => Promise<void>;
  onUpdateList: (id: number, input: UpdateImportListInput) => Promise<void>;
  onDeleteList: (id: number) => Promise<void>;
  onSyncList: (id: number) => Promise<void>;
  onCreateExclusion: (input: CreateExclusionInput) => Promise<void>;
  onDeleteExclusion: (id: number) => Promise<void>;
  onRefreshLists: () => void;
  onRefreshExclusions: () => void;
  
  // Optional customization
  title?: string;
  description?: string;
  defaultTab?: TabType;
}

export function ImportListSettings({
  lists,
  exclusions,
  qualityProfiles,
  isLoadingLists,
  isLoadingExclusions,
  listsError,
  exclusionsError,
  onCreateList,
  onUpdateList,
  onDeleteList,
  onSyncList,
  onCreateExclusion,
  onDeleteExclusion,
  onRefreshLists,
  onRefreshExclusions,
  title = 'Import Lists',
  description = 'Configure import lists to automatically add media from external sources.',
  defaultTab = 'lists',
}: ImportListSettingsProps) {
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);

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

  // Create/Update list handler
  const handleSaveList = async (input: CreateImportListInput | UpdateImportListInput) => {
    setIsSaving(true);
    try {
      if (editList) {
        await onUpdateList(editList.id, input as UpdateImportListInput);
      } else {
        await onCreateList(input as CreateImportListInput);
      }
      setIsListModalOpen(false);
      setEditList(undefined);
      onRefreshLists();
    } finally {
      setIsSaving(false);
    }
  };

  // Delete list handler
  const handleDeleteList = async () => {
    if (!deleteList) return;

    setIsSaving(true);
    try {
      await onDeleteList(deleteList.id);
      setDeleteList(undefined);
      onRefreshLists();
    } finally {
      setIsSaving(false);
    }
  };

  // Sync list handler
  const handleSyncList = async (list: ImportList) => {
    setSyncingId(list.id);
    try {
      await onSyncList(list.id);
      onRefreshLists();
    } finally {
      setSyncingId(null);
    }
  };

  // Add exclusion handler
  const handleAddExclusion = async (input: CreateExclusionInput) => {
    setIsSaving(true);
    try {
      await onCreateExclusion(input);
      setIsExclusionModalOpen(false);
      onRefreshExclusions();
    } finally {
      setIsSaving(false);
    }
  };

  // Delete exclusion handler
  const handleDeleteExclusion = async () => {
    if (!deleteExclusion) return;

    setIsDeletingExclusion(true);
    try {
      await onDeleteExclusion(deleteExclusion.id);
      setDeleteExclusion(undefined);
      onRefreshExclusions();
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
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-text-secondary">{description}</p>
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
            <Button variant="default" onClick={openAddModal}>
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
          confirmVariant="destructive"
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
          confirmVariant="destructive"
          isConfirming={isDeletingExclusion}
        />
      )}
    </section>
  );
}
