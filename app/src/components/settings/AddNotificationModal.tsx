
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from '@/components/primitives/Alert';
import { Button } from '@/components/primitives/Button';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/primitives/Modal';
import { getApiClients } from '@/lib/api/client';
import type {
  Notification,
  NotificationFormData,
  NotificationTestResult,
  NotificationType,
  NotificationTrigger,
} from '@/types/notification';
import {
  getNotificationTypeLabel,
  getNotificationTriggerLabel,
} from '@/types/notification';

interface AddNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  notificationToEdit?: Notification;
}

const NOTIFICATION_TYPES: NotificationType[] = [
  'Discord',
  'Telegram',
  'Email',
  'Slack',
  'Webhook',
  'Pushover',
];

const TRIGGER_OPTIONS: NotificationTrigger[] = [
  'OnGrab',
  'OnDownload',
  'OnImport',
  'OnUpgrade',
  'OnHealthIssue',
  'OnDelete',
];

function getWebhookUrl(notification?: Notification): string {
  if (!notification) return '';
  if (notification.type === 'Discord' || notification.type === 'Slack' || notification.type === 'Webhook') {
    return notification.webhookUrl ?? '';
  }
  return '';
}

function getBotToken(notification?: Notification): string {
  if (!notification) return '';
  if (notification.type === 'Telegram') {
    return notification.botToken ?? '';
  }
  return '';
}

function getChatId(notification?: Notification): string {
  if (!notification) return '';
  if (notification.type === 'Telegram') {
    return notification.chatId ?? '';
  }
  return '';
}

function getSmtpServer(notification?: Notification): string {
  if (!notification) return '';
  if (notification.type === 'Email') {
    return notification.smtpServer ?? '';
  }
  return '';
}

function getSmtpPort(notification?: Notification): string {
  if (!notification) return '587';
  if (notification.type === 'Email') {
    return String(notification.smtpPort ?? 587);
  }
  return '587';
}

function getSmtpUser(notification?: Notification): string {
  if (!notification) return '';
  if (notification.type === 'Email') {
    return notification.smtpUser ?? '';
  }
  return '';
}

function getSmtpPassword(notification?: Notification): string {
  if (!notification) return '';
  if (notification.type === 'Email') {
    return notification.smtpPassword ?? '';
  }
  return '';
}

function getFromAddress(notification?: Notification): string {
  if (!notification) return '';
  if (notification.type === 'Email') {
    return notification.fromAddress ?? '';
  }
  return '';
}

function getToAddress(notification?: Notification): string {
  if (!notification) return '';
  if (notification.type === 'Email') {
    return notification.toAddress ?? '';
  }
  return '';
}

function getMethod(notification?: Notification): 'GET' | 'POST' | 'PUT' {
  if (!notification) return 'POST';
  if (notification.type === 'Webhook') {
    return notification.method ?? 'POST';
  }
  return 'POST';
}

function getHeaders(notification?: Notification): string {
  if (!notification) return '';
  if (notification.type === 'Webhook' && notification.headers) {
    return JSON.stringify(notification.headers, null, 2);
  }
  return '';
}

export function AddNotificationModal({ isOpen, onClose, notificationToEdit }: AddNotificationModalProps) {
  const queryClient = useQueryClient();
  const notificationsApi = getApiClients().notificationsApi;

  const isEditing = Boolean(notificationToEdit);

  // Form state
  const [name, setName] = useState(notificationToEdit?.name ?? '');
  const [type, setType] = useState<NotificationType>(notificationToEdit?.type ?? 'Discord');
  const [enabled, setEnabled] = useState(notificationToEdit?.enabled ?? true);
  const [triggers, setTriggers] = useState<NotificationTrigger[]>(
    notificationToEdit?.triggers ?? ['OnGrab', 'OnDownload'],
  );

  // Type-specific fields
  const [webhookUrl, setWebhookUrl] = useState(getWebhookUrl(notificationToEdit));
  const [botToken, setBotToken] = useState(getBotToken(notificationToEdit));
  const [chatId, setChatId] = useState(getChatId(notificationToEdit));
  const [smtpServer, setSmtpServer] = useState(getSmtpServer(notificationToEdit));
  const [smtpPort, setSmtpPort] = useState(getSmtpPort(notificationToEdit));
  const [smtpUser, setSmtpUser] = useState(getSmtpUser(notificationToEdit));
  const [smtpPassword, setSmtpPassword] = useState(getSmtpPassword(notificationToEdit));
  const [fromAddress, setFromAddress] = useState(getFromAddress(notificationToEdit));
  const [toAddress, setToAddress] = useState(getToAddress(notificationToEdit));
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT'>(getMethod(notificationToEdit));
  const [headers, setHeaders] = useState<string>(getHeaders(notificationToEdit));

  const [testResult, setTestResult] = useState<NotificationTestResult | null>(null);

  const createMutation = useMutation({
    mutationFn: (data: NotificationFormData) => notificationsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      handleClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<NotificationFormData> }) =>
      notificationsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      handleClose();
    },
  });

  const testMutation = useMutation({
    mutationFn: (data: NotificationFormData) => notificationsApi.testDraft(data),
    onSuccess: result => {
      setTestResult(result);
    },
  });

  const handleClose = () => {
    resetForm();
    setTestResult(null);
    onClose();
  };

  const resetForm = () => {
    setName('');
    setType('Discord');
    setEnabled(true);
    setTriggers(['OnGrab', 'OnDownload']);
    setWebhookUrl('');
    setBotToken('');
    setChatId('');
    setSmtpServer('');
    setSmtpPort('587');
    setSmtpUser('');
    setSmtpPassword('');
    setFromAddress('');
    setToAddress('');
    setMethod('POST');
    setHeaders('');
  };

  const handleTypeChange = (newType: NotificationType) => {
    setType(newType);
    // Reset type-specific fields when switching types
    setWebhookUrl('');
    setBotToken('');
    setChatId('');
    setSmtpServer('');
    setSmtpPort('587');
    setSmtpUser('');
    setSmtpPassword('');
    setFromAddress('');
    setToAddress('');
    setMethod('POST');
    setHeaders('');
  };

  const handleTriggerToggle = (trigger: NotificationTrigger) => {
    setTriggers(current =>
      current.includes(trigger) ? current.filter(t => t !== trigger) : [...current, trigger],
    );
  };

  const handleTest = () => {
    const data: NotificationFormData = {
      name,
      type,
      enabled,
      triggers,
      ...(type === 'Discord' || type === 'Slack' || type === 'Webhook' ? { webhookUrl } : {}),
      ...(type === 'Telegram' ? { botToken, chatId } : {}),
      ...(type === 'Email' ? { smtpServer, smtpPort: Number.parseInt(smtpPort, 10) || 587, smtpUser, smtpPassword, fromAddress, toAddress } : {}),
      ...(type === 'Webhook' ? { method, headers: headers ? JSON.parse(headers) : undefined } : {}),
    };

    setTestResult(null);
    testMutation.mutate(data);
  };

  const handleSubmit = () => {
    const data: NotificationFormData = {
      name,
      type,
      enabled,
      triggers,
      ...(type === 'Discord' || type === 'Slack' || type === 'Webhook' ? { webhookUrl } : {}),
      ...(type === 'Telegram' ? { botToken, chatId } : {}),
      ...(type === 'Email' ? { smtpServer, smtpPort: Number.parseInt(smtpPort, 10) || 587, smtpUser, smtpPassword, fromAddress, toAddress } : {}),
      ...(type === 'Webhook' ? { method, headers: headers ? JSON.parse(headers) : undefined } : {}),
    };

    if (isEditing && notificationToEdit) {
      updateMutation.mutate({ id: notificationToEdit.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isFormValid = () => {
    if (!name.trim()) return false;

    // Type-specific validation
    if (type === 'Discord' || type === 'Slack' || type === 'Webhook') {
      if (!webhookUrl.trim()) return false;
    }

    if (type === 'Telegram') {
      if (!botToken.trim() || !chatId.trim()) return false;
    }

    if (type === 'Email') {
      if (!smtpServer.trim() || !smtpUser.trim() || !fromAddress.trim() || !toAddress.trim()) return false;
    }

    return true;
  };

  const renderTypeSpecificFields = () => {
    switch (type) {
      case 'Discord':
      case 'Slack':
        return (
          <div className="space-y-3">
            <label className="grid gap-1 text-sm">
              <span>{type === 'Slack' ? 'Slack Webhook URL' : 'Webhook URL'}</span>
              <input
                type="url"
                className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm font-mono"
                placeholder={type === 'Slack' ? 'https://hooks.slack.com/services/...' : 'https://discord.com/api/webhooks/...'}
                value={webhookUrl}
                onChange={e => setWebhookUrl(e.target.value)}
              />
            </label>
          </div>
        );

      case 'Telegram':
        return (
          <div className="space-y-3">
            <label className="grid gap-1 text-sm">
              <span>Bot Token</span>
              <input
                type="text"
                className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm font-mono"
                placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                value={botToken}
                onChange={e => setBotToken(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span>Chat ID</span>
              <input
                type="text"
                className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm font-mono"
                placeholder="123456789 or @channelname"
                value={chatId}
                onChange={e => setChatId(e.target.value)}
              />
            </label>
          </div>
        );

      case 'Email':
        return (
          <div className="space-y-3">
            <label className="grid gap-1 text-sm">
              <span>SMTP Server</span>
              <input
                type="text"
                className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
                placeholder="smtp.gmail.com"
                value={smtpServer}
                onChange={e => setSmtpServer(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span>SMTP Port</span>
              <input
                type="number"
                className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
                placeholder="587"
                value={smtpPort}
                onChange={e => setSmtpPort(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span>SMTP Username</span>
              <input
                type="text"
                className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
                placeholder="username@gmail.com"
                value={smtpUser}
                onChange={e => setSmtpUser(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span>SMTP Password</span>
              <input
                type="password"
                className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
                placeholder="Your password or app password"
                value={smtpPassword}
                onChange={e => setSmtpPassword(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span>From Address</span>
              <input
                type="email"
                className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
                placeholder="mediarr@example.com"
                value={fromAddress}
                onChange={e => setFromAddress(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span>To Address</span>
              <input
                type="email"
                className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
                placeholder="recipient@example.com"
                value={toAddress}
                onChange={e => setToAddress(e.target.value)}
              />
            </label>
          </div>
        );

      case 'Webhook':
        return (
          <div className="space-y-3">
            <label className="grid gap-1 text-sm">
              <span>Webhook URL</span>
              <input
                type="url"
                className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm font-mono"
                placeholder="https://example.com/webhook"
                value={webhookUrl}
                onChange={e => setWebhookUrl(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span>Method</span>
              <select
                className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
                value={method}
                onChange={e => setMethod(e.target.value as 'GET' | 'POST' | 'PUT')}
              >
                <option value="POST">POST</option>
                <option value="GET">GET</option>
                <option value="PUT">PUT</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span>Headers (JSON)</span>
              <textarea
                className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm font-mono"
                rows={4}
                placeholder='{"Authorization": "Bearer token"}'
                value={headers}
                onChange={e => setHeaders(e.target.value)}
              />
            </label>
          </div>
        );

      case 'Pushover':
        return (
          <div className="space-y-3">
            <Alert variant="info">
              <p>Pushover configuration requires your application API key and user key.</p>
            </Alert>
            <p className="text-sm text-text-muted">Implementation pending backend support.</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      ariaLabel={isEditing ? 'Edit Notification' : 'Add Notification'}
      onClose={handleClose}
      maxWidthClassName="max-w-2xl"
    >
      <ModalHeader
        title={isEditing ? 'Edit Notification' : 'Add Notification'}
        actions={
          <Button variant="secondary" onClick={handleTest} disabled={!isFormValid() || testMutation.isPending}>
            {testMutation.isPending ? 'Testing...' : 'Test'}
          </Button>
        }
      />
      <ModalBody>
        <div className="space-y-4">
          {/* Test Result */}
          {testResult && (
            <Alert variant={testResult.success ? 'success' : 'danger'}>
              <p>{testResult.message}</p>
            </Alert>
          )}

          {/* Name */}
          <label className="grid gap-1 text-sm">
            <span>Name</span>
            <input
              type="text"
              className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
              placeholder="e.g., Discord Notifications"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </label>

          {/* Type */}
          <label className="grid gap-1 text-sm">
            <span>Type</span>
            <select
              className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
              value={type}
              onChange={e => handleTypeChange(e.target.value as NotificationType)}
              disabled={isEditing}
            >
              {NOTIFICATION_TYPES.map(t => (
                <option key={t} value={t}>
                  {getNotificationTypeLabel(t)}
                </option>
              ))}
            </select>
          </label>

          {/* Type-specific fields */}
          {renderTypeSpecificFields()}

          {/* Triggers */}
          <div className="space-y-2">
            <span className="text-sm font-medium">Triggers</span>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {TRIGGER_OPTIONS.map(trigger => (
                <label key={trigger} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={triggers.includes(trigger)}
                    onChange={() => handleTriggerToggle(trigger)}
                  />
                  {getNotificationTriggerLabel(trigger)}
                </label>
              ))}
            </div>
          </div>

          {/* Enabled */}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
            Enabled
          </label>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={handleClose} disabled={createMutation.isPending || updateMutation.isPending}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!isFormValid() || createMutation.isPending || updateMutation.isPending}
        >
          {createMutation.isPending || updateMutation.isPending ? 'Saving...' : isEditing ? 'Update' : 'Add'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
