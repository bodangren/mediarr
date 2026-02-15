'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable, type DataTableColumn } from '@/components/primitives/DataTable';
import { ConfirmModal, Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/primitives/Modal';
import { PageToolbar, PageToolbarSection } from '@/components/primitives/PageToolbar';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';

type TagRow = {
  id: number;
  label: string;
  color: string;
  indexerCount: number;
  applicationCount: number;
  downloadClientCount: number;
};

interface SaveTagInput {
  label: string;
  color: string;
}

interface TagAssignment {
  id: number;
  name: string;
}

interface TagDetailsResponse {
  tag: {
    id: number;
    label: string;
    color: string;
  };
  indexers: TagAssignment[];
  applications: TagAssignment[];
  downloadClients: TagAssignment[];
}

export interface AddTagDraft {
  label: string;
  color: string;
}

export interface EditTagDraft {
  id: number;
  label: string;
  color: string;
}

function TagBadge({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-4 w-4 rounded-sm border border-border-subtle"
        style={{ backgroundColor: color }}
      />
      <span className="font-medium">{label}</span>
    </div>
  );
}

export function AddTagModal({
  isOpen,
  isSubmitting = false,
  onClose,
  onCreate,
}: {
  isOpen: boolean;
  isSubmitting?: boolean;
  onClose: () => void;
  onCreate: (draft: AddTagDraft) => void | Promise<void>;
}) {
  const [label, setLabel] = useState('');
  const [color, setColor] = useState('#FF5733');
  const [validationError, setValidationError] = useState<string | null>(null);

  const presetColors = [
    '#FF5733',
    '#33FF57',
    '#3357FF',
    '#FF33A8',
    '#33FFF5',
    '#F5FF33',
    '#FF8C33',
    '#8C33FF',
    '#FF3333',
    '#33FF99',
  ];

  const buildDraft = (): AddTagDraft | null => {
    if (label.trim().length === 0) {
      setValidationError('Label is required.');
      return null;
    }

    if (!/^#[0-9A-F]{6}$/i.test(color)) {
      setValidationError('Color must be a valid hex code (e.g., #FF5733).');
      return null;
    }

    setValidationError(null);

    return {
      label: label.trim(),
      color,
    };
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const draft = buildDraft();
    if (!draft) {
      return;
    }

    await onCreate(draft);
  };

  return (
    <Modal isOpen={isOpen} ariaLabel="Add tag" onClose={onClose}>
      <ModalHeader title="Add Tag" onClose={onClose} />
      <ModalBody>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="add-tag-label" className="mb-1 block text-sm font-medium">
              Label
            </label>
            <input
              id="add-tag-label"
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="e.g., HD Movies"
              className="w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm focus:border-border-focus focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="add-tag-color" className="mb-1 block text-sm font-medium">
              Color
            </label>
            <div className="flex items-center gap-2">
              <input
                id="add-tag-color"
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="h-10 w-16 cursor-pointer rounded-sm border border-border-subtle bg-surface-0"
              />
              <input
                type="text"
                value={color}
                onChange={e => setColor(e.target.value)}
                placeholder="#FF5733"
                className="flex-1 rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm font-mono focus:border-border-focus focus:outline-none"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {presetColors.map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setColor(preset)}
                  className={`h-6 w-6 rounded-sm border border-border-subtle transition-transform hover:scale-110 ${
                    color === preset ? 'ring-2 ring-border-focus' : ''
                  }`}
                  style={{ backgroundColor: preset }}
                  aria-label={`Select color ${preset}`}
                />
              ))}
            </div>
          </div>

          {validationError ? (
            <p role="alert" className="text-sm text-status-error">
              {validationError}
            </p>
          ) : null}

          <ModalFooter>
            <button
              type="button"
              className="rounded-sm border border-border-subtle px-3 py-1.5 text-sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-sm bg-accent-primary px-3 py-1.5 text-sm text-text-inverse hover:bg-accent-primary/90 disabled:opacity-50"
              disabled={isSubmitting}
            >
              Add Tag
            </button>
          </ModalFooter>
        </form>
      </ModalBody>
    </Modal>
  );
}

export function EditTagModal({
  isOpen,
  tag,
  isSubmitting = false,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  tag: TagRow | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSave: (draft: EditTagDraft) => void | Promise<void>;
}) {
  const [label, setLabel] = useState('');
  const [color, setColor] = useState('#FF5733');
  const [validationError, setValidationError] = useState<string | null>(null);

  const presetColors = [
    '#FF5733',
    '#33FF57',
    '#3357FF',
    '#FF33A8',
    '#33FFF5',
    '#F5FF33',
    '#FF8C33',
    '#8C33FF',
    '#FF3333',
    '#33FF99',
  ];

  useEffect(() => {
    if (isOpen && tag) {
      setLabel(tag.label);
      setColor(tag.color);
      setValidationError(null);
    }
  }, [isOpen, tag]);

  const buildDraft = (): EditTagDraft | null => {
    if (!tag) return null;

    if (label.trim().length === 0) {
      setValidationError('Label is required.');
      return null;
    }

    if (!/^#[0-9A-F]{6}$/i.test(color)) {
      setValidationError('Color must be a valid hex code (e.g., #FF5733).');
      return null;
    }

    setValidationError(null);

    return {
      id: tag.id,
      label: label.trim(),
      color,
    };
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const draft = buildDraft();
    if (!draft) {
      return;
    }

    await onSave(draft);
  };

  return (
    <Modal isOpen={isOpen} ariaLabel="Edit tag" onClose={onClose}>
      <ModalHeader title="Edit Tag" onClose={onClose} />
      <ModalBody>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="edit-tag-label" className="mb-1 block text-sm font-medium">
              Label
            </label>
            <input
              id="edit-tag-label"
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="e.g., HD Movies"
              className="w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm focus:border-border-focus focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="edit-tag-color" className="mb-1 block text-sm font-medium">
              Color
            </label>
            <div className="flex items-center gap-2">
              <input
                id="edit-tag-color"
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="h-10 w-16 cursor-pointer rounded-sm border border-border-subtle bg-surface-0"
              />
              <input
                type="text"
                value={color}
                onChange={e => setColor(e.target.value)}
                placeholder="#FF5733"
                className="flex-1 rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm font-mono focus:border-border-focus focus:outline-none"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {presetColors.map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setColor(preset)}
                  className={`h-6 w-6 rounded-sm border border-border-subtle transition-transform hover:scale-110 ${
                    color === preset ? 'ring-2 ring-border-focus' : ''
                  }`}
                  style={{ backgroundColor: preset }}
                  aria-label={`Select color ${preset}`}
                />
              ))}
            </div>
          </div>

          {validationError ? (
            <p role="alert" className="text-sm text-status-error">
              {validationError}
            </p>
          ) : null}

          <ModalFooter>
            <button
              type="button"
              className="rounded-sm border border-border-subtle px-3 py-1.5 text-sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-sm bg-accent-primary px-3 py-1.5 text-sm text-text-inverse hover:bg-accent-primary/90 disabled:opacity-50"
              disabled={isSubmitting}
            >
              Save Changes
            </button>
          </ModalFooter>
        </form>
      </ModalBody>
    </Modal>
  );
}

export function TagDetailsModal({
  isOpen,
  tagId,
  onClose,
}: {
  isOpen: boolean;
  tagId: number | null;
  onClose: () => void;
}) {
  const api = useMemo(() => getApiClients(), []);
  const { data: tagDetails, isLoading } = useApiQuery({
    queryKey: tagId ? queryKeys.tagDetails(tagId) : ['tags', 'details', null],
    queryFn: () => api.tagsApi.getDetails(tagId!),
    enabled: isOpen && tagId !== null,
  });

  return (
    <Modal isOpen={isOpen} ariaLabel="Tag details" onClose={onClose}>
      <ModalHeader title="Tag Details" onClose={onClose} />
      <ModalBody>
        {isLoading ? (
          <div className="py-4 text-center text-text-muted">Loading...</div>
        ) : tagDetails ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TagBadge color={tagDetails.tag.color} label={tagDetails.tag.label} />
            </div>

            <div>
              <h3 className="mb-2 text-sm font-medium">Indexers ({tagDetails.indexers.length})</h3>
              {tagDetails.indexers.length === 0 ? (
                <p className="text-sm text-text-muted">No indexers assigned</p>
              ) : (
                <ul className="space-y-1">
                  {tagDetails.indexers.map(indexer => (
                    <li key={indexer.id} className="text-sm">
                      {indexer.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-medium">Applications ({tagDetails.applications.length})</h3>
              {tagDetails.applications.length === 0 ? (
                <p className="text-sm text-text-muted">No applications assigned</p>
              ) : (
                <ul className="space-y-1">
                  {tagDetails.applications.map(app => (
                    <li key={app.id} className="text-sm">
                      {app.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-medium">Download Clients ({tagDetails.downloadClients.length})</h3>
              {tagDetails.downloadClients.length === 0 ? (
                <p className="text-sm text-text-muted">No download clients assigned</p>
              ) : (
                <ul className="space-y-1">
                  {tagDetails.downloadClients.map(dc => (
                    <li key={dc.id} className="text-sm">
                      {dc.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <div className="py-4 text-center text-text-muted">No details available</div>
        )}

        <ModalFooter>
          <button
            type="button"
            className="rounded-sm border border-border-subtle px-3 py-1.5 text-sm"
            onClick={onClose}
          >
            Close
          </button>
        </ModalFooter>
      </ModalBody>
    </Modal>
  );
}

export default function TagsPage() {
  const api = useMemo(() => getApiClients(), []);
  const queryClient = useQueryClient();
  const { pushToast } = useToast();

  const [editing, setEditing] = useState<TagRow | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [viewingDetailsId, setViewingDetailsId] = useState<number | null>(null);

  const tagsQuery = useApiQuery<TagRow[]>({
    queryKey: queryKeys.tags(),
    queryFn: async () => {
      const tags = await api.tagsApi.list();
      return tags.map(tag => ({
        id: tag.id,
        label: tag.label,
        color: tag.color,
        indexerCount: tag.indexerIds.length,
        applicationCount: tag.applicationIds.length,
        downloadClientCount: tag.downloadClientIds.length,
      }));
    },
    staleTimeKind: 'list',
    isEmpty: rows => rows.length === 0,
  });

  const createMutation = useMutation({
    mutationFn: (payload: SaveTagInput) => api.tagsApi.create(payload),
    onSuccess: () => {
      pushToast({
        title: 'Tag created',
        variant: 'success',
      });
      setIsAddModalOpen(false);
      void queryClient.invalidateQueries({ queryKey: queryKeys.tags() });
    },
    onError: (error: Error) => {
      pushToast({
        title: 'Save failed',
        message: error.message,
        variant: 'error',
      });
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: SaveTagInput }) =>
      api.tagsApi.update(id, payload),
    onSuccess: () => {
      pushToast({
        title: 'Tag updated',
        variant: 'success',
      });
      setEditing(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.tags() });
    },
    onError: (error: Error) => {
      pushToast({
        title: 'Save failed',
        message: error.message,
        variant: 'error',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.tagsApi.remove(id),
    onSuccess: () => {
      pushToast({
        title: 'Tag deleted',
        variant: 'success',
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tags() });
    },
    onError: (error: Error) => {
      pushToast({
        title: 'Delete failed',
        message: error.message,
        variant: 'error',
      });
    },
  });

  const columns: DataTableColumn<TagRow>[] = [
    {
      key: 'label',
      header: 'Tag',
      sortable: true,
      render: row => <TagBadge color={row.color} label={row.label} />,
    },
    {
      key: 'indexerCount',
      header: 'Indexers',
      sortable: false,
      render: row => (
        <button
          type="button"
          className="text-sm text-accent-primary hover:underline"
          onClick={() => setViewingDetailsId(row.id)}
        >
          {row.indexerCount}
        </button>
      ),
    },
    {
      key: 'applicationCount',
      header: 'Applications',
      sortable: false,
      render: row => (
        <button
          type="button"
          className="text-sm text-accent-primary hover:underline"
          onClick={() => setViewingDetailsId(row.id)}
        >
          {row.applicationCount}
        </button>
      ),
    },
    {
      key: 'downloadClientCount',
      header: 'Download Clients',
      sortable: false,
      render: row => (
        <button
          type="button"
          className="text-sm text-accent-primary hover:underline"
          onClick={() => setViewingDetailsId(row.id)}
        >
          {row.downloadClientCount}
        </button>
      ),
    },
  ];

  const handleCreateFromModal = (draft: AddTagDraft) => {
    createMutation.mutate(draft);
  };

  const handleEditFromModal = (draft: EditTagDraft) => {
    editMutation.mutate({
      id: draft.id,
      payload: {
        label: draft.label,
        color: draft.color,
      },
    });
  };

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Tags</h1>
        <p className="text-sm text-text-secondary">
          Manage tags for organizing indexers, applications, and download clients.
        </p>
      </header>

      <PageToolbar>
        <PageToolbarSection>
          <button
            type="button"
            className="rounded-sm border border-border-subtle px-3 py-1 text-sm"
            onClick={() => {
              setEditing(null);
              setIsAddModalOpen(true);
            }}
          >
            Add
          </button>
          <button
            type="button"
            className="rounded-sm border border-border-subtle px-3 py-1 text-sm"
            onClick={() => {
              void tagsQuery.refetch();
            }}
          >
            Refresh
          </button>
        </PageToolbarSection>
      </PageToolbar>

      <QueryPanel
        isLoading={tagsQuery.isPending}
        isError={tagsQuery.isError}
        isEmpty={tagsQuery.isResolvedEmpty}
        errorMessage={tagsQuery.error?.message}
        onRetry={() => void tagsQuery.refetch()}
        emptyTitle="No tags configured"
        emptyBody="Create your first tag to organize indexers, applications, and download clients."
      >
        <DataTable
          data={tagsQuery.data ?? []}
          columns={columns}
          getRowId={row => row.id}
          onSort={() => {
            // Sorting is managed by backend defaults for now.
          }}
          rowActions={row => (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-sm border border-border-subtle px-2 py-1 text-xs"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditing(row);
                }}
              >
                Edit
              </button>
              <button
                type="button"
                className="rounded-sm border border-border-subtle px-2 py-1 text-xs"
                onClick={() => setViewingDetailsId(row.id)}
              >
                Details
              </button>
              <button
                type="button"
                className="rounded-sm border border-status-error/60 px-2 py-1 text-xs text-status-error"
                onClick={() => setPendingDeleteId(row.id)}
              >
                Delete
              </button>
            </div>
          )}
        />
      </QueryPanel>

      <AddTagModal
        isOpen={isAddModalOpen}
        isSubmitting={createMutation.isPending}
        onClose={() => setIsAddModalOpen(false)}
        onCreate={handleCreateFromModal}
      />

      <EditTagModal
        isOpen={editing !== null}
        tag={editing}
        isSubmitting={editMutation.isPending}
        onClose={() => setEditing(null)}
        onSave={handleEditFromModal}
      />

      <TagDetailsModal
        isOpen={viewingDetailsId !== null}
        tagId={viewingDetailsId}
        onClose={() => setViewingDetailsId(null)}
      />

      <ConfirmModal
        isOpen={pendingDeleteId !== null}
        title="Delete tag"
        description="This will remove the tag from all indexers, applications, and download clients. This action cannot be undone."
        onCancel={() => {
          setPendingDeleteId(null);
        }}
        onConfirm={() => {
          if (pendingDeleteId) {
            deleteMutation.mutate(pendingDeleteId);
            setPendingDeleteId(null);
          }
        }}
        confirmLabel="Delete Tag"
        isConfirming={deleteMutation.isPending}
      />
    </section>
  );
}
