'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from '@/components/primitives/Alert';
import { Button } from '@/components/primitives/Button';
import { ConfirmModal, Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/primitives/Modal';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import type { ApplicationItem, CreateApplicationInput } from '@/lib/api/applicationsApi';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';

type ApplicationForm = CreateApplicationInput;

const EMPTY_FORM: ApplicationForm = {
  name: '',
  type: 'Sonarr',
  baseUrl: '',
  apiKey: '',
  syncCategories: [],
  tags: [],
};

function parseNumberList(raw: string): number[] {
  return raw
    .split(',')
    .map((token) => Number.parseInt(token.trim(), 10))
    .filter((value) => Number.isFinite(value));
}

function parseStringList(raw: string): string[] {
  return raw
    .split(',')
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

export default function SettingsApplicationsPage() {
  const api = useMemo(() => getApiClients(), []);
  const queryClient = useQueryClient();
  const { pushToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<ApplicationItem | null>(null);
  const [form, setForm] = useState<ApplicationForm>(EMPTY_FORM);
  const [categoriesText, setCategoriesText] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [pendingDelete, setPendingDelete] = useState<ApplicationItem | null>(null);

  const applicationsQuery = useApiQuery({
    queryKey: queryKeys.applications(),
    queryFn: () => api.applicationsApi.list(),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        return api.applicationsApi.update(editing.id, form);
      }
      return api.applicationsApi.create(form);
    },
    onSuccess: () => {
      setIsModalOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      setCategoriesText('');
      setTagsText('');
      void queryClient.invalidateQueries({ queryKey: queryKeys.applications() });
      pushToast({
        title: editing ? 'Application updated' : 'Application created',
        variant: 'success',
      });
    },
    onError: (error: Error) => {
      pushToast({
        title: 'Save failed',
        message: error.message,
        variant: 'error',
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: (id: number) => api.applicationsApi.test(id),
    onSuccess: (result) => {
      pushToast({
        title: result.success ? 'Connection successful' : 'Connection failed',
        message: result.message,
        variant: result.success ? 'success' : 'error',
      });
    },
    onError: (error: Error) => {
      pushToast({
        title: 'Test failed',
        message: error.message,
        variant: 'error',
      });
    },
  });

  const syncAllMutation = useMutation({
    mutationFn: () => api.applicationsApi.syncAll(),
    onSuccess: (result) => {
      pushToast({
        title: result.success ? 'Sync completed' : 'Sync completed with failures',
        message: result.message,
        variant: result.success ? 'success' : 'warning',
      });
    },
    onError: (error: Error) => {
      pushToast({
        title: 'Sync failed',
        message: error.message,
        variant: 'error',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.applicationsApi.remove(id),
    onSuccess: () => {
      setPendingDelete(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.applications() });
      pushToast({ title: 'Application deleted', variant: 'success' });
    },
    onError: (error: Error) => {
      pushToast({ title: 'Delete failed', message: error.message, variant: 'error' });
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setCategoriesText('');
    setTagsText('');
    setIsModalOpen(true);
  };

  const openEdit = (application: ApplicationItem) => {
    setEditing(application);
    setForm({
      name: application.name,
      type: application.type,
      baseUrl: application.baseUrl,
      apiKey: application.apiKey,
      syncCategories: application.syncCategories,
      tags: application.tags,
    });
    setCategoriesText(application.syncCategories.join(', '));
    setTagsText(application.tags.join(', '));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setCategoriesText('');
    setTagsText('');
  };

  const canSave =
    form.name.trim().length > 0
    && form.baseUrl.trim().length > 0
    && form.apiKey.trim().length > 0;

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Applications</h1>
        <p className="text-sm text-text-secondary">
          Manage Sonarr and Radarr application integrations, test connectivity, and sync indexers.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <Button onClick={openCreate}>Add Application</Button>
        <Button variant="secondary" onClick={() => syncAllMutation.mutate()} disabled={syncAllMutation.isPending}>
          {syncAllMutation.isPending ? 'Syncing...' : 'Sync All'}
        </Button>
      </div>

      {applicationsQuery.isPending ? (
        <div className="rounded-sm border border-border-subtle bg-surface-1 p-4 text-sm text-text-secondary">
          Loading applications...
        </div>
      ) : null}

      {applicationsQuery.isError ? (
        <Alert variant="danger">
          <p>Could not load applications: {applicationsQuery.error?.message}</p>
        </Alert>
      ) : null}

      {applicationsQuery.data && applicationsQuery.data.length === 0 ? (
        <Alert variant="info">
          <p>No applications configured yet.</p>
        </Alert>
      ) : null}

      {applicationsQuery.data && applicationsQuery.data.length > 0 ? (
        <div className="space-y-2">
          {applicationsQuery.data.map((application) => (
            <div key={application.id} className="rounded-sm border border-border-subtle bg-surface-1 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-text-primary">{application.name}</p>
                  <p className="text-xs text-text-secondary">{application.type} - {application.baseUrl}</p>
                  <p className="text-xs text-text-muted">
                    Categories: {application.syncCategories.join(', ') || 'All'} | Tags: {application.tags.join(', ') || 'None'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" className="text-xs" onClick={() => testMutation.mutate(application.id)}>
                    Test
                  </Button>
                  <Button variant="secondary" className="text-xs" onClick={() => openEdit(application)}>
                    Edit
                  </Button>
                  <Button variant="danger" className="text-xs" onClick={() => setPendingDelete(application)}>
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <Modal isOpen={isModalOpen} ariaLabel="Application modal" onClose={closeModal} maxWidthClassName="max-w-xl">
        <ModalHeader title={editing ? 'Edit Application' : 'Add Application'} onClose={closeModal} />
        <ModalBody>
          <div className="space-y-3">
            <label className="grid gap-1 text-sm">
              <span>Name</span>
              <input
                type="text"
                className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span>Type</span>
              <select
                className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2"
                value={form.type}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  type: event.target.value as ApplicationForm['type'],
                }))}
              >
                <option value="Sonarr">Sonarr</option>
                <option value="Radarr">Radarr</option>
              </select>
            </label>

            <label className="grid gap-1 text-sm">
              <span>Base URL</span>
              <input
                type="url"
                className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2"
                value={form.baseUrl}
                onChange={(event) => setForm((current) => ({ ...current, baseUrl: event.target.value }))}
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span>API Key</span>
              <input
                type="password"
                className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2"
                value={form.apiKey}
                onChange={(event) => setForm((current) => ({ ...current, apiKey: event.target.value }))}
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span>Sync Categories (comma separated)</span>
              <input
                type="text"
                className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2"
                value={categoriesText}
                onChange={(event) => {
                  const value = event.target.value;
                  setCategoriesText(value);
                  setForm((current) => ({ ...current, syncCategories: parseNumberList(value) }));
                }}
                placeholder="2000, 5000"
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span>Tags (comma separated)</span>
              <input
                type="text"
                className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2"
                value={tagsText}
                onChange={(event) => {
                  const value = event.target.value;
                  setTagsText(value);
                  setForm((current) => ({ ...current, tags: parseStringList(value) }));
                }}
                placeholder="movies, public"
              />
            </label>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={closeModal}>Cancel</Button>
          <Button variant="primary" onClick={() => saveMutation.mutate()} disabled={!canSave || saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving...' : editing ? 'Update' : 'Create'}
          </Button>
        </ModalFooter>
      </Modal>

      <ConfirmModal
        isOpen={pendingDelete !== null}
        title="Delete application"
        description={`Delete ${pendingDelete?.name ?? 'application'}?`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            deleteMutation.mutate(pendingDelete.id);
          }
        }}
        confirmLabel="Delete"
        confirmVariant="danger"
      />
    </section>
  );
}
