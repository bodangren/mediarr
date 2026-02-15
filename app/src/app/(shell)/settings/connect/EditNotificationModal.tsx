'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/primitives/Button';
import { CheckInput, Form, FormGroup, SelectInput, TextInput } from '@/components/primitives/Form';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/primitives/Modal';
import type { NotificationType } from './AddNotificationModal';

export interface EditNotificationDraft {
  id: number;
  name: string;
  type: NotificationType;
  triggers: string[];
  enabled: boolean;
  webhookUrl?: string;
  botToken?: string;
  chatId?: string;
  smtpServer?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  fromAddress?: string;
  toAddress?: string;
  method?: 'GET' | 'POST' | 'PUT';
  headers?: Record<string, string>;
}

export interface EditNotificationSource {
  id: number;
  name: string;
  type: NotificationType;
  triggers: string[];
  enabled: boolean;
  webhookUrl?: string;
  botToken?: string;
  chatId?: string;
  smtpServer?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  fromAddress?: string;
  toAddress?: string;
  method?: 'GET' | 'POST' | 'PUT';
  headers?: Record<string, string>;
}

interface NotificationTypeOption {
  value: NotificationType;
  label: string;
}

interface EditNotificationModalProps {
  isOpen: boolean;
  notification: EditNotificationSource;
  notificationTypes: NotificationTypeOption[];
  isSubmitting?: boolean;
  onClose: () => void;
  onSave: (draft: EditNotificationDraft) => void | Promise<void>;
}

const triggerOptions: Array<{ value: string; label: string }> = [
  { value: 'OnGrab', label: 'On Grab' },
  { value: 'OnDownload', label: 'On Download' },
  { value: 'OnImport', label: 'On Import' },
  { value: 'OnUpgrade', label: 'On Upgrade' },
  { value: 'OnHealthIssue', label: 'On Health Issue' },
  { value: 'OnDelete', label: 'On Delete' },
];

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function EditNotificationModal({
  isOpen,
  notification,
  notificationTypes,
  isSubmitting = false,
  onClose,
  onSave,
}: EditNotificationModalProps) {
  const [name, setName] = useState(notification.name);
  const [type] = useState(notification.type);
  const [triggers, setTriggers] = useState(notification.triggers);
  const [enabled, setEnabled] = useState(notification.enabled);
  const [webhookUrl, setWebhookUrl] = useState(notification.webhookUrl ?? '');
  const [botToken, setBotToken] = useState(notification.botToken ?? '');
  const [chatId, setChatId] = useState(notification.chatId ?? '');
  const [smtpServer, setSmtpServer] = useState(notification.smtpServer ?? '');
  const [smtpPort, setSmtpPort] = useState(String(notification.smtpPort ?? '587'));
  const [smtpUser, setSmtpUser] = useState(notification.smtpUser ?? '');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [fromAddress, setFromAddress] = useState(notification.fromAddress ?? '');
  const [toAddress, setToAddress] = useState(notification.toAddress ?? '');
  const [method, setMethod] = useState(notification.method ?? 'POST');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (name.trim().length === 0) {
      setValidationError('Name is required.');
      return;
    }

    if (type === 'Discord' || type === 'Webhook' || type === 'Slack') {
      if (webhookUrl.trim().length === 0) {
        setValidationError('Webhook URL is required.');
        return;
      }

      if (!isValidUrl(webhookUrl)) {
        setValidationError('Webhook URL must be a valid URL.');
        return;
      }
    }

    if (type === 'Telegram') {
      if (botToken.trim().length === 0) {
        setValidationError('Bot Token is required.');
        return;
      }

      if (chatId.trim().length === 0) {
        setValidationError('Chat ID is required.');
        return;
      }
    }

    if (type === 'Email') {
      if (smtpServer.trim().length === 0) {
        setValidationError('SMTP Server is required.');
        return;
      }

      if (fromAddress.trim().length === 0) {
        setValidationError('From Address is required.');
        return;
      }

      if (toAddress.trim().length === 0) {
        setValidationError('To Address is required.');
        return;
      }
    }

    if (triggers.length === 0) {
      setValidationError('At least one trigger is required.');
      return;
    }

    setValidationError(null);

    await onSave({
      id: notification.id,
      name: name.trim(),
      type,
      triggers,
      enabled,
      webhookUrl: webhookUrl.trim() || undefined,
      botToken: botToken.trim() || undefined,
      chatId: chatId.trim() || undefined,
      smtpServer: smtpServer.trim() || undefined,
      smtpPort: smtpPort ? parseInt(smtpPort, 10) : undefined,
      smtpUser: smtpUser.trim() || undefined,
      smtpPassword: smtpPassword.trim() || undefined,
      fromAddress: fromAddress.trim() || undefined,
      toAddress: toAddress.trim() || undefined,
      method,
    });
  };

  const toggleTrigger = (trigger: string) => {
    if (triggers.includes(trigger)) {
      setTriggers(triggers.filter(t => t !== trigger));
    } else {
      setTriggers([...triggers, trigger]);
    }
  };

  return (
    <Modal isOpen={isOpen} ariaLabel="Edit notification" onClose={onClose} maxWidthClassName="max-w-2xl">
      <ModalHeader title="Edit Notification" onClose={onClose} />
      <ModalBody>
        <Form onSubmit={handleSubmit}>
          <FormGroup label="Name" htmlFor="edit-notification-name">
            <TextInput id="edit-notification-name" ariaLabel="Name" value={name} onChange={setName} />
          </FormGroup>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-text-primary">Type</label>
            <p className="text-sm text-text-secondary">{type}</p>
          </div>

          {type === 'Discord' || type === 'Webhook' || type === 'Slack' ? (
            <FormGroup label="Webhook URL" htmlFor="edit-notification-webhookurl">
              <TextInput
                id="edit-notification-webhookurl"
                ariaLabel="Webhook URL"
                type="url"
                value={webhookUrl}
                onChange={setWebhookUrl}
              />
            </FormGroup>
          ) : null}

          {type === 'Telegram' ? (
            <>
              <FormGroup label="Bot Token" htmlFor="edit-notification-bottoken">
                <TextInput
                  id="edit-notification-bottoken"
                  ariaLabel="Bot Token"
                  type="password"
                  value={botToken}
                  onChange={setBotToken}
                  placeholder="Leave unchanged to keep existing"
                />
              </FormGroup>

              <FormGroup label="Chat ID" htmlFor="edit-notification-chatid">
                <TextInput
                  id="edit-notification-chatid"
                  ariaLabel="Chat ID"
                  value={chatId}
                  onChange={setChatId}
                />
              </FormGroup>
            </>
          ) : null}

          {type === 'Email' ? (
            <>
              <FormGroup label="SMTP Server" htmlFor="edit-notification-smtpserver">
                <TextInput
                  id="edit-notification-smtpserver"
                  ariaLabel="SMTP Server"
                  value={smtpServer}
                  onChange={setSmtpServer}
                />
              </FormGroup>

              <FormGroup label="SMTP Port" htmlFor="edit-notification-smtpport">
                <TextInput
                  id="edit-notification-smtpport"
                  ariaLabel="SMTP Port"
                  value={smtpPort}
                  onChange={setSmtpPort}
                />
              </FormGroup>

              <FormGroup label="SMTP User" htmlFor="edit-notification-smtpuser">
                <TextInput
                  id="edit-notification-smtpuser"
                  ariaLabel="SMTP User"
                  value={smtpUser}
                  onChange={setSmtpUser}
                />
              </FormGroup>

              <FormGroup label="SMTP Password" htmlFor="edit-notification-smtppassword">
                <TextInput
                  id="edit-notification-smtppassword"
                  ariaLabel="SMTP Password"
                  type="password"
                  value={smtpPassword}
                  onChange={setSmtpPassword}
                  placeholder="Leave unchanged to keep existing"
                />
              </FormGroup>

              <FormGroup label="From Address" htmlFor="edit-notification-fromaddress">
                <TextInput
                  id="edit-notification-fromaddress"
                  ariaLabel="From Address"
                  type="email"
                  value={fromAddress}
                  onChange={setFromAddress}
                />
              </FormGroup>

              <FormGroup label="To Address" htmlFor="edit-notification-toaddress">
                <TextInput
                  id="edit-notification-toaddress"
                  ariaLabel="To Address"
                  type="email"
                  value={toAddress}
                  onChange={setToAddress}
                />
              </FormGroup>
            </>
          ) : null}

          {type === 'Webhook' ? (
            <SelectInput
              id="edit-notification-method"
              label="HTTP Method"
              value={method}
              onChange={value => setMethod(value as 'GET' | 'POST' | 'PUT')}
              options={[
                { value: 'GET', label: 'GET' },
                { value: 'POST', label: 'POST' },
                { value: 'PUT', label: 'PUT' },
              ]}
            />
          ) : null}

          <div className="space-y-2">
            <p className="text-sm font-medium text-text-primary">Triggers</p>
            <div className="flex flex-wrap gap-2">
              {triggerOptions.map(trigger => (
                <button
                  key={trigger.value}
                  type="button"
                  onClick={() => toggleTrigger(trigger.value)}
                  className={`rounded-sm border px-2 py-1 text-xs ${
                    triggers.includes(trigger.value)
                      ? 'border-accent-primary bg-accent-primary/10 text-text-primary'
                      : 'border-border-subtle text-text-secondary'
                  }`}
                >
                  {trigger.label}
                </button>
              ))}
            </div>
          </div>

          <CheckInput id="edit-notification-enabled" label="Enabled" checked={enabled} onChange={setEnabled} />

          {validationError ? (
            <p role="alert" className="text-sm text-status-error">
              {validationError}
            </p>
          ) : null}

          <ModalFooter>
            <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmitting}>
              Save Changes
            </Button>
          </ModalFooter>
        </Form>
      </ModalBody>
    </Modal>
  );
}
