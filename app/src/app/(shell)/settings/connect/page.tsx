'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable, type DataTableColumn } from '@/components/primitives/DataTable';
import { ConfirmModal, Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/primitives/Modal';
import { PageToolbar, PageToolbarSection } from '@/components/primitives/PageToolbar';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { type CreateNotificationInput, type NotificationItem, type NotificationTestResult, type UpdateNotificationInput, type TriggerType } from '@/lib/api/notificationsApi';
import { AddNotificationModal, type AddNotificationDraft, type NotificationType } from './AddNotificationModal';
import { EditNotificationModal, type EditNotificationDraft } from './EditNotificationModal';

type NotificationRow = {
  id: number;
  name: string;
  type: NotificationType;
  triggers: TriggerType[];
  enabled: boolean;
};

const notificationTypes: Array<{
  value: 'Discord' | 'Telegram' | 'Email' | 'Webhook' | 'Slack' | 'Pushover' | 'Pushbullet';
  label: string;
}> = [
  { value: 'Discord', label: 'Discord' },
  { value: 'Telegram', label: 'Telegram' },
  { value: 'Email', label: 'Email' },
  { value: 'Webhook', label: 'Webhook' },
  { value: 'Slack', label: 'Slack' },
  { value: 'Pushover', label: 'Pushover' },
  { value: 'Pushbullet', label: 'Pushbullet' },
];

export default function NotificationsPage() {
  const api = useMemo(() => getApiClients(), []);
  const queryClient = useQueryClient();
  const { pushToast } = useToast();

  const [editing, setEditing] = useState<NotificationRow | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [testResultModal, setTestResultModal] = useState<{ isOpen: boolean; result: NotificationTestResult | null }>({
    isOpen: false,
    result: null,
  });

  const notificationsQuery = useApiQuery({
    queryKey: queryKeys.notifications(),
    queryFn: async () => {
      const notifications = await api.notificationsApi.list();
      return notifications.map((n): NotificationRow => ({
        id: n.id,
        name: n.name,
        type: n.type,
        triggers: n.triggers,
        enabled: n.enabled,
      }));
    },
    staleTimeKind: 'list',
    isEmpty: rows => rows.length === 0,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.notificationsApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
      pushToast({
        title: 'Notification deleted',
        variant: 'success',
      });
    },
    onError: (error: Error) => {
      pushToast({
        title: 'Delete failed',
        message: error.message,
        variant: 'error',
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateNotificationInput) => api.notificationsApi.create(payload),
    onSuccess: () => {
      pushToast({
        title: 'Notification created',
        variant: 'success',
      });
      setIsAddModalOpen(false);
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
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
    mutationFn: ({ id, payload }: { id: number; payload: UpdateNotificationInput }) =>
      api.notificationsApi.update(id, payload),
    onSuccess: () => {
      pushToast({
        title: 'Notification updated',
        variant: 'success',
      });
      setEditing(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
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
    mutationFn: (id: number) => api.notificationsApi.test(id),
    onSuccess: (result, id) => {
      setTestResultModal({
        isOpen: true,
        result,
      });

      pushToast({
        title: result.success ? 'Test notification sent' : 'Test notification failed',
        message: result.message,
        variant: result.success ? 'success' : 'error',
      });
    },
    onError: (error: Error) => {
      pushToast({
        title: 'Test notification failed',
        message: error.message,
        variant: 'error',
      });
    },
  });

  const draftTestMutation = useMutation({
    mutationFn: (payload: CreateNotificationInput) => api.notificationsApi.testDraft(payload),
  });

  const columns: DataTableColumn<NotificationRow>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: row => (
        <div>
          <p className="font-medium">{row.name}</p>
          <p className="text-xs text-text-muted">{row.type}</p>
        </div>
      ),
    },
    {
      key: 'triggers',
      header: 'Triggers',
      render: row => <span className="text-sm">{row.triggers.map(t => t).join(', ')}</span>,
    },
    {
      key: 'status',
      header: 'Actions',
      render: row => (
        <StatusBadge status={row.enabled ? 'completed' : 'paused'} />
      ),
    },
  ];

  const handleCreateFromModal = (draft: AddNotificationDraft) => {
    const payload: CreateNotificationInput = {
      name: draft.name,
      type: draft.type,
      triggers: draft.triggers as TriggerType[],
      enabled: draft.enabled,
      webhookUrl: draft.webhookUrl,
      botToken: draft.botToken,
      chatId: draft.chatId,
      smtpServer: draft.smtpServer,
      smtpPort: draft.smtpPort,
      smtpUser: draft.smtpUser,
      smtpPassword: draft.smtpPassword,
      fromAddress: draft.fromAddress,
      toAddress: draft.toAddress,
      method: draft.method,
    };
    createMutation.mutate(payload);
  };

  const handleEditFromModal = (draft: EditNotificationDraft) => {
    const payload: UpdateNotificationInput = {
      name: draft.name,
      triggers: draft.triggers as TriggerType[],
      enabled: draft.enabled,
      webhookUrl: draft.webhookUrl,
      botToken: draft.botToken,
      chatId: draft.chatId,
      smtpServer: draft.smtpServer,
      smtpPort: draft.smtpPort,
      smtpUser: draft.smtpUser,
      smtpPassword: draft.smtpPassword,
      fromAddress: draft.fromAddress,
      toAddress: draft.toAddress,
      method: draft.method,
    };

    editMutation.mutate({
      id: draft.id,
      payload,
    });
  };

  const handleDraftNotificationTest = async (draft: AddNotificationDraft) => {
    const payload: CreateNotificationInput = {
      name: draft.name,
      type: draft.type,
      triggers: draft.triggers as TriggerType[],
      enabled: draft.enabled,
      webhookUrl: draft.webhookUrl,
      botToken: draft.botToken,
      chatId: draft.chatId,
      smtpServer: draft.smtpServer,
      smtpPort: draft.smtpPort,
      smtpUser: draft.smtpUser,
      smtpPassword: draft.smtpPassword,
      fromAddress: draft.fromAddress,
      toAddress: draft.toAddress,
      method: draft.method,
    };
    const result = await draftTestMutation.mutateAsync(payload);
    return {
      success: result.success,
      message: result.message,
      hints: [],
    };
  };

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Notification Providers</h1>
        <p className="text-sm text-text-secondary">
          Manage notification providers and trigger policies.
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
              void notificationsQuery.refetch();
            }}
          >
            Refresh
          </button>
        </PageToolbarSection>
      </PageToolbar>

      <QueryPanel
        isLoading={notificationsQuery.isPending}
        isError={notificationsQuery.isError}
        isEmpty={notificationsQuery.isResolvedEmpty}
        errorMessage={notificationsQuery.error?.message}
        onRetry={() => void notificationsQuery.refetch()}
        emptyTitle="No notifications configured"
        emptyBody="Create your first notification provider."
      >
        <DataTable
          data={notificationsQuery.data ?? []}
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
                onClick={() => testMutation.mutate(row.id)}
                disabled={testMutation.isPending}
              >
                Test
              </button>
              <button
                type="button"
                className="rounded-sm border border-status-error/60 px-2 py-1 text-xs text-status-error"
                onClick={() => deleteMutation.mutate(row.id)}
              >
                Delete
              </button>
            </div>
          )}
        />
      </QueryPanel>

      <AddNotificationModal
        isOpen={isAddModalOpen}
        notificationTypes={notificationTypes}
        isSubmitting={createMutation.isPending}
        onClose={() => setIsAddModalOpen(false)}
        onCreate={handleCreateFromModal}
        onTestNotification={handleDraftNotificationTest}
      />

      {editing ? (
        <EditNotificationModal
          key={editing.id}
          isOpen
          notification={editing}
          notificationTypes={notificationTypes}
          isSubmitting={editMutation.isPending}
          onClose={() => setEditing(null)}
          onSave={handleEditFromModal}
        />
      ) : null}

      <Modal
        isOpen={testResultModal.isOpen}
        ariaLabel="Test Notification Result"
        onClose={() => {
          setTestResultModal({ isOpen: false, result: null });
        }}
      >
        <ModalHeader title="Test Notification Result" onClose={() => {
          setTestResultModal({ isOpen: false, result: null });
        }} />
        <ModalBody>
          {testResultModal.result ? (
            <div className="space-y-3">
              <p className={testResultModal.result.success ? 'text-status-success' : 'text-status-error'}>
                {testResultModal.result.message}
              </p>
            </div>
          ) : null}
        </ModalBody>
        <ModalFooter>
          <button
            type="button"
            className="rounded-sm border border-border-subtle px-3 py-1 text-sm"
            onClick={() => {
              setTestResultModal({ isOpen: false, result: null });
            }}
          >
            Close
          </button>
        </ModalFooter>
      </Modal>
    </section>
  );
}
