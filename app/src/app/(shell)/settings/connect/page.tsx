'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from '@/components/primitives/Alert';
import { Button } from '@/components/primitives/Button';
import { ConfirmModal } from '@/components/primitives/Modal';
import { AddNotificationModal } from '@/components/settings/AddNotificationModal';
import { getApiClients } from '@/lib/api/client';
import type { Notification, NotificationTestResult } from '@/types/notification';
import { getNotificationTypeLabel, getNotificationTypeIcon } from '@/types/notification';

export default function NotificationsSettingsPage() {
  const queryClient = useQueryClient();
  const notificationsApi = getApiClients().notificationsApi;

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingNotification, setEditingNotification] = useState<Notification | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Notification | undefined>();
  const [testResults, setTestResults] = useState<Map<number, NotificationTestResult>>(new Map());

  const { data: notifications = [], isPending, isError, error } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list(),
    staleTime: 30000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => notificationsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setDeleteTarget(undefined);
    },
  });

  const testMutation = useMutation({
    mutationFn: (id: number) => notificationsApi.test(id),
    onSuccess: (result, id) => {
      setTestResults(current => new Map(current).set(id, result));
    },
  });

  const handleAdd = () => {
    setEditingNotification(undefined);
    setIsAddModalOpen(true);
  };

  const handleEdit = (notification: Notification) => {
    setEditingNotification(notification);
    setIsAddModalOpen(true);
  };

  const handleDelete = (notification: Notification) => {
    setDeleteTarget(notification);
  };

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id);
    }
  };

  const handleTest = (notification: Notification) => {
    setTestResults(current => {
      const next = new Map(current);
      next.delete(notification.id);
      return next;
    });
    testMutation.mutate(notification.id);
  };

  const handleToggleEnabled = (notification: Notification, enabled: boolean) => {
    queryClient.setQueryData(['notifications'], (current: Notification[] = []) =>
      current.map(n => (n.id === notification.id ? { ...n, enabled } : n)),
    );
    // Optimistic update - should call API in production
  };

  if (isPending) {
    return (
      <section className="space-y-5">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <p className="text-sm text-text-secondary">Manage notification connections for alerts and updates.</p>
        </header>
        <div className="rounded-md border border-border-subtle bg-surface-1 p-4 text-sm text-text-secondary">
          Loading notifications…
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="space-y-5">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <p className="text-sm text-text-secondary">Manage notification connections for alerts and updates.</p>
        </header>
        <div className="rounded-md border border-status-error/50 bg-surface-danger p-4 text-sm text-text-primary">
          <p>Could not load notifications: {error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="text-sm text-text-secondary">Manage notification connections for alerts and updates.</p>
      </header>

      {/* Notification List */}
      <section className="space-y-3 rounded-md border border-border-subtle bg-surface-1 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Connections</h2>
          <Button variant="primary" onClick={handleAdd}>
            Add Connection
          </Button>
        </div>

        {notifications.length === 0 ? (
          <Alert variant="info">
            <p>No notification connections configured. Click Add Connection to create one.</p>
          </Alert>
        ) : (
          <div className="space-y-2">
            {notifications.map(notification => (
              <div
                key={notification.id}
                className="flex items-center justify-between rounded-sm border border-border-subtle bg-surface-0 p-3"
              >
                <div className="flex flex-1 items-start gap-3">
                  <div className="flex items-center gap-3">
                    {/* Status indicator */}
                    <div
                      className={`h-2 w-2 rounded-full ${
                        notification.enabled ? 'bg-status-completed' : 'bg-text-muted'
                      }`}
                      title={notification.enabled ? 'Enabled' : 'Disabled'}
                    />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{notification.name}</p>
                      <span className="text-xs text-text-muted">{getNotificationTypeLabel(notification.type)}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1 text-xs">
                      {notification.triggers.map(trigger => (
                        <span
                          key={trigger}
                          className="rounded-sm border border-border-subtle bg-surface-1 px-2 py-0.5 text-text-secondary"
                        >
                          {trigger.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                      ))}
                    </div>
                    {testResults.has(notification.id) && (
                      <div className="mt-2">
                        <Alert variant={testResults.get(notification.id)?.success ? 'success' : 'danger'}>
                          <p className="text-xs">{testResults.get(notification.id)?.message}</p>
                        </Alert>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Enable/Disable toggle */}
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={notification.enabled}
                      onChange={e => handleToggleEnabled(notification, e.target.checked)}
                    />
                    <span className="sr-only">Enabled</span>
                  </label>

                  {/* Test button */}
                  <Button
                    variant="secondary"
                    onClick={() => handleTest(notification)}
                    disabled={testMutation.isPending}
                    className="text-xs"
                  >
                    Test
                  </Button>

                  {/* Edit button */}
                  <Button
                    variant="secondary"
                    onClick={() => handleEdit(notification)}
                    className="text-xs"
                  >
                    Edit
                  </Button>

                  {/* Delete button */}
                  <Button
                    variant="danger"
                    onClick={() => handleDelete(notification)}
                    disabled={deleteMutation.isPending}
                    className="text-xs"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Add/Edit Modal */}
      <AddNotificationModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingNotification(undefined);
        }}
        notificationToEdit={editingNotification}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteTarget !== undefined}
        title="Delete Notification Connection"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        onCancel={() => setDeleteTarget(undefined)}
        onConfirm={handleConfirmDelete}
        confirmLabel="Delete"
        confirmVariant="danger"
        isConfirming={deleteMutation.isPending}
      />
    </section>
  );
}
