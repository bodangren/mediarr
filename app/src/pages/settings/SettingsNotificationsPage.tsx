import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AddNotificationModal } from '@/components/settings/AddNotificationModal';
import { RouteScaffold } from '@/components/primitives/RouteScaffold';
import { useToast } from '@/components/providers/ToastProvider';
import { Alert } from '@/components/ui/alert-compat';
import { Button } from '@/components/ui/button';
import { ConfirmModal } from '@/components/ui/modal';
import { getApiClients } from '@/lib/api/client';
import type { NotificationItem } from '@/lib/api/notificationsApi';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Notification request failed.';
}

export function SettingsNotificationsPage() {
  const api = useMemo(() => getApiClients(), []);
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [notificationToEdit, setNotificationToEdit] = useState<NotificationItem | undefined>();
  const [notificationPendingDeletion, setNotificationPendingDeletion] = useState<NotificationItem | undefined>();

  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.notificationsApi.list(),
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) =>
      api.notificationsApi.update(id, { enabled }),
    onSuccess: async (_item, variables) => {
      pushToast({
        title: variables.enabled ? 'Notification enabled' : 'Notification disabled',
        variant: 'success',
      });
      await refresh();
    },
    onError: error => {
      pushToast({ title: 'Notification update failed', message: errorMessage(error), variant: 'error' });
    },
  });

  const testMutation = useMutation({
    mutationFn: (id: number) => api.notificationsApi.test(id),
    onSuccess: result => {
      pushToast({
        title: result.success ? 'Notification test sent' : 'Notification test failed',
        message: result.message,
        variant: result.success ? 'success' : 'error',
      });
    },
    onError: error => {
      pushToast({ title: 'Notification test failed', message: errorMessage(error), variant: 'error' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.notificationsApi.remove(id),
    onSuccess: async () => {
      setNotificationPendingDeletion(undefined);
      pushToast({ title: 'Notification deleted', variant: 'success' });
      await refresh();
    },
    onError: error => {
      pushToast({ title: 'Notification deletion failed', message: errorMessage(error), variant: 'error' });
    },
  });

  const openAddModal = () => {
    setNotificationToEdit(undefined);
    setModalOpen(true);
  };

  const openEditModal = (notification: NotificationItem) => {
    setNotificationToEdit(notification);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setNotificationToEdit(undefined);
  };

  const removeNotification = (notification: NotificationItem) => {
    setNotificationPendingDeletion(notification);
  };

  const confirmRemoval = () => {
    if (notificationPendingDeletion) {
      deleteMutation.mutate(notificationPendingDeletion.id);
    }
  };

  const notifications = notificationsQuery.data ?? [];

  return (
    <>
      <RouteScaffold
        title="Notifications"
        description="Unified notification providers for movie, TV, and system events."
        actions={<Button variant="primary" size="sm" onClick={openAddModal}>Add Notification</Button>}
      >
        {notificationsQuery.isPending ? (
          <p className="rounded-md border border-border-subtle bg-surface-1 p-3 text-sm text-text-secondary">
            Loading notification integrations…
          </p>
        ) : null}

        {notificationsQuery.isError ? (
          <Alert variant="danger">
            <p>{errorMessage(notificationsQuery.error)}</p>
          </Alert>
        ) : null}

        {notificationsQuery.isSuccess ? (
          <ul className="space-y-2">
            {notifications.length === 0 ? (
              <li className="rounded-md border border-border-subtle bg-surface-1 p-3 text-sm text-text-secondary">
                No notification integrations configured.
              </li>
            ) : notifications.map(item => (
              <li
                key={item.id}
                className="flex flex-col gap-3 rounded-md border border-border-subtle bg-surface-1 p-3 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-text-secondary">{item.type} - {item.enabled ? 'Enabled' : 'Disabled'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    aria-label={`Edit ${item.name}`}
                    onClick={() => openEditModal(item)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    aria-label={`Test ${item.name}`}
                    disabled={testMutation.isPending}
                    onClick={() => testMutation.mutate(item.id)}
                  >
                    Test
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="xs"
                    aria-label={`${item.enabled ? 'Disable' : 'Enable'} ${item.name}`}
                    disabled={updateMutation.isPending}
                    onClick={() => updateMutation.mutate({ id: item.id, enabled: !item.enabled })}
                  >
                    {item.enabled ? 'Disable' : 'Enable'}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="xs"
                    aria-label={`Delete ${item.name}`}
                    disabled={deleteMutation.isPending}
                    onClick={() => removeNotification(item)}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </RouteScaffold>

      {modalOpen ? (
        <AddNotificationModal
          key={notificationToEdit?.id ?? 'new'}
          isOpen
          notificationToEdit={notificationToEdit}
          onClose={closeModal}
        />
      ) : null}

      {notificationPendingDeletion ? (
        <ConfirmModal
          isOpen
          title="Delete Notification"
          description={
            <div className="space-y-2">
              <p>
                Delete notification <strong>{notificationPendingDeletion.name}</strong>?
              </p>
              <p className="text-xs text-text-muted">
                This permanently removes the integration configuration. It cannot be undone.
              </p>
            </div>
          }
          onCancel={() => setNotificationPendingDeletion(undefined)}
          onConfirm={confirmRemoval}
          cancelLabel="Cancel"
          confirmLabel="Delete Notification"
          confirmVariant="destructive"
          isConfirming={deleteMutation.isPending}
        />
      ) : null}
    </>
  );
}
