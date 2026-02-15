'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/primitives/Button';
import { CheckInput, Form, FormGroup, SelectInput, TextInput } from '@/components/primitives/Form';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/primitives/Modal';

export type NotificationType = 'Discord' | 'Telegram' | 'Email' | 'Webhook' | 'Slack' | 'Pushover' | 'Pushbullet';

export interface AddNotificationDraft {
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

interface TestNotificationResult {
  success: boolean;
  message: string;
  hints: string[];
}

interface NotificationTypeOption {
  value: NotificationType;
  label: string;
}

interface AddNotificationModalProps {
  isOpen: boolean;
  notificationTypes: NotificationTypeOption[];
  isSubmitting?: boolean;
  onClose: () => void;
  onCreate: (draft: AddNotificationDraft) => void | Promise<void>;
  onTestNotification: (draft: AddNotificationDraft) => Promise<TestNotificationResult>;
}

const notificationTypes: Array<{ value: NotificationType; label: string }> = [
  { value: 'Discord', label: 'Discord' },
  { value: 'Telegram', label: 'Telegram' },
  { value: 'Email', label: 'Email' },
  { value: 'Webhook', label: 'Webhook' },
  { value: 'Slack', label: 'Slack' },
  { value: 'Pushover', label: 'Pushover' },
  { value: 'Pushbullet', label: 'Pushbullet' },
];

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

export function AddNotificationModal({
  isOpen,
  notificationTypes,
  isSubmitting = false,
  onClose,
  onCreate,
  onTestNotification,
}: AddNotificationModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<NotificationType>('Discord');
  const [triggers, setTriggers] = useState<string[]>(['OnGrab']);
  const [enabled, setEnabled] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [smtpServer, setSmtpServer] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [fromAddress, setFromAddress] = useState('');
  const [toAddress, setToAddress] = useState('');
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT'>('POST');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<TestNotificationResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setName('');
    setType('Discord');
    setTriggers(['OnGrab']);
    setEnabled(true);
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
    setValidationError(null);
    setTestResult(null);
  }, [isOpen]);

  const buildDraft = (): AddNotificationDraft | null => {
    if (name.trim().length === 0) {
      setValidationError('Name is required.');
      return null;
    }

    if (type === 'Discord' || type === 'Webhook' || type === 'Slack') {
      if (webhookUrl.trim().length === 0) {
        setValidationError('Webhook URL is required.');
        return null;
      }

      if (!isValidUrl(webhookUrl)) {
        setValidationError('Webhook URL must be a valid URL.');
        return null;
      }
    }

    if (type === 'Telegram') {
      if (botToken.trim().length === 0) {
        setValidationError('Bot Token is required.');
        return null;
      }

      if (chatId.trim().length === 0) {
        setValidationError('Chat ID is required.');
        return null;
      }
    }

    if (type === 'Email') {
      if (smtpServer.trim().length === 0) {
        setValidationError('SMTP Server is required.');
        return null;
      }

      if (fromAddress.trim().length === 0) {
        setValidationError('From Address is required.');
        return null;
      }

      if (toAddress.trim().length === 0) {
        setValidationError('To Address is required.');
        return null;
      }
    }

    if (triggers.length === 0) {
      setValidationError('At least one trigger is required.');
      return null;
    }

    setValidationError(null);

    return {
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
    };
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const draft = buildDraft();
    if (!draft) {
      return;
    }

    await onCreate(draft);
  };

  const handleTestNotification = async () => {
    const draft = buildDraft();
    if (!draft) {
      return;
    }

    setIsTesting(true);
    try {
      const result = await onTestNotification(draft);
      setTestResult(result);
    } finally {
      setIsTesting(false);
    }
  };

  const toggleTrigger = (trigger: string) => {
    if (triggers.includes(trigger)) {
      setTriggers(triggers.filter(t => t !== trigger));
    } else {
      setTriggers([...triggers, trigger]);
    }
  };

  return (
    <Modal isOpen={isOpen} ariaLabel="Add notification" onClose={onClose} maxWidthClassName="max-w-2xl">
      <ModalHeader title="Add Notification" onClose={onClose} />
      <ModalBody>
        <Form onSubmit={handleSubmit}>
          <FormGroup label="Name" htmlFor="add-notification-name">
            <TextInput id="add-notification-name" ariaLabel="Name" value={name} onChange={setName} placeholder="My Discord Notification" />
          </FormGroup>

          <SelectInput
            id="add-notification-type"
            label="Notification Type"
            value={type}
            onChange={value => setType(value as NotificationType)}
            options={notificationTypes}
          />

          {type === 'Discord' || type === 'Webhook' || type === 'Slack' ? (
            <FormGroup label="Webhook URL" htmlFor="add-notification-webhookurl">
              <TextInput
                id="add-notification-webhookurl"
                ariaLabel="Webhook URL"
                type="url"
                value={webhookUrl}
                onChange={setWebhookUrl}
                placeholder="https://discord.com/api/webhooks/..."
              />
            </FormGroup>
          ) : null}

          {type === 'Telegram' ? (
            <>
              <FormGroup label="Bot Token" htmlFor="add-notification-bottoken">
                <TextInput
                  id="add-notification-bottoken"
                  ariaLabel="Bot Token"
                  type="password"
                  value={botToken}
                  onChange={setBotToken}
                  placeholder="123456:ABC-DEF..."
                />
              </FormGroup>

              <FormGroup label="Chat ID" htmlFor="add-notification-chatid">
                <TextInput
                  id="add-notification-chatid"
                  ariaLabel="Chat ID"
                  value={chatId}
                  onChange={setChatId}
                  placeholder="123456789"
                />
              </FormGroup>
            </>
          ) : null}

          {type === 'Email' ? (
            <>
              <FormGroup label="SMTP Server" htmlFor="add-notification-smtpserver">
                <TextInput
                  id="add-notification-smtpserver"
                  ariaLabel="SMTP Server"
                  value={smtpServer}
                  onChange={setSmtpServer}
                  placeholder="smtp.gmail.com"
                />
              </FormGroup>

              <FormGroup label="SMTP Port" htmlFor="add-notification-smtpport">
                <TextInput
                  id="add-notification-smtpport"
                  ariaLabel="SMTP Port"
                  value={smtpPort}
                  onChange={setSmtpPort}
                  placeholder="587"
                />
              </FormGroup>

              <FormGroup label="SMTP User" htmlFor="add-notification-smtpuser">
                <TextInput
                  id="add-notification-smtpuser"
                  ariaLabel="SMTP User"
                  value={smtpUser}
                  onChange={setSmtpUser}
                  placeholder="username@example.com"
                />
              </FormGroup>

              <FormGroup label="SMTP Password" htmlFor="add-notification-smtppassword">
                <TextInput
                  id="add-notification-smtppassword"
                  ariaLabel="SMTP Password"
                  type="password"
                  value={smtpPassword}
                  onChange={setSmtpPassword}
                  placeholder="Password"
                />
              </FormGroup>

              <FormGroup label="From Address" htmlFor="add-notification-fromaddress">
                <TextInput
                  id="add-notification-fromaddress"
                  ariaLabel="From Address"
                  type="email"
                  value={fromAddress}
                  onChange={setFromAddress}
                  placeholder="noreply@example.com"
                />
              </FormGroup>

              <FormGroup label="To Address" htmlFor="add-notification-toaddress">
                <TextInput
                  id="add-notification-toaddress"
                  ariaLabel="To Address"
                  type="email"
                  value={toAddress}
                  onChange={setToAddress}
                  placeholder="user@example.com"
                />
              </FormGroup>
            </>
          ) : null}

          {type === 'Webhook' ? (
            <SelectInput
              id="add-notification-method"
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

          <CheckInput id="add-notification-enabled" label="Enabled" checked={enabled} onChange={setEnabled} />

          {validationError ? (
            <p role="alert" className="text-sm text-status-error">
              {validationError}
            </p>
          ) : null}

          {testResult ? (
            <section className="rounded-sm border border-border-subtle bg-surface-0 p-3 text-sm">
              <p className={testResult.success ? 'text-status-success' : 'text-status-error'}>{testResult.message}</p>
              {testResult.hints.length > 0 ? (
                <ul className="mt-2 list-disc pl-4 text-text-secondary">
                  {testResult.hints.map(hint => (
                    <li key={hint}>{hint}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}

          <ModalFooter>
            <Button variant="secondary" onClick={onClose} disabled={isSubmitting || isTesting}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={handleTestNotification} disabled={isSubmitting || isTesting}>
              {isTesting ? 'Testing...' : 'Test'}
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmitting || isTesting}>
              Add Notification
            </Button>
          </ModalFooter>
        </Form>
      </ModalBody>
    </Modal>
  );
}
