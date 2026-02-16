'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/primitives/Button';
import { CheckInput, Form, FormGroup, TextInput } from '@/components/primitives/Form';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/primitives/Modal';
import { NumberInput } from '@/components/primitives/SpecialInputs';
import type { DownloadClientDraft, DownloadClientType } from '@/types/downloadClient';

export interface DownloadClientPreset {
  id: DownloadClientType;
  name: string;
  description: string;
  implementation: string;
  configContract: string;
  protocol: string;
  defaultPort: number;
  requiresAuth: boolean;
}

export interface AddDownloadClientProps {
  isOpen: boolean;
  presets?: DownloadClientPreset[];
  isSubmitting?: boolean;
  onClose: () => void;
  onCreate: (draft: DownloadClientDraft) => void | Promise<void>;
  onTestConnection: (draft: DownloadClientDraft) => Promise<{ success: boolean; message: string; hints: string[] }>;
}

const DEFAULT_PRESETS: DownloadClientPreset[] = [
  {
    id: 'transmission',
    name: 'Transmission',
    description: 'Lightweight BitTorrent client',
    implementation: 'Transmission',
    configContract: 'TransmissionSettings',
    protocol: 'torrent',
    defaultPort: 9091,
    requiresAuth: true,
  },
  {
    id: 'qbittorrent',
    name: 'qBittorrent',
    description: 'Cross-platform Bittorrent client',
    implementation: 'QBittorrent',
    configContract: 'QBittorrentSettings',
    protocol: 'torrent',
    defaultPort: 8080,
    requiresAuth: true,
  },
  {
    id: 'deluge',
    name: 'Deluge',
    description: 'Lightweight, free BitTorrent client',
    implementation: 'Deluge',
    configContract: 'DelugeSettings',
    protocol: 'torrent',
    defaultPort: 58846,
    requiresAuth: false,
  },
  {
    id: 'rtorrent',
    name: 'rTorrent',
    description: 'Command-line BitTorrent client',
    implementation: 'RTorrent',
    configContract: 'RTorrentSettings',
    protocol: 'torrent',
    defaultPort: 5000,
    requiresAuth: false,
  },
  {
    id: 'sabnzbd',
    name: 'SABnzbd',
    description: 'Usenet NZB downloader',
    implementation: 'SABnzbd',
    configContract: 'SABnzbdSettings',
    protocol: 'usenet',
    defaultPort: 8080,
    requiresAuth: true,
  },
  {
    id: 'nzbget',
    name: 'NZBGet',
    description: 'Efficient Usenet NZB downloader',
    implementation: 'NZBGet',
    configContract: 'NZBGetSettings',
    protocol: 'usenet',
    defaultPort: 6789,
    requiresAuth: true,
  },
];

export function AddDownloadClientModal({
  isOpen,
  presets = DEFAULT_PRESETS,
  isSubmitting = false,
  onClose,
  onCreate,
  onTestConnection,
}: AddDownloadClientProps) {
  const [selectedPresetId, setSelectedPresetId] = useState<DownloadClientType>(presets[0]?.id ?? 'transmission');
  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('9091');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState(1);
  const [enabled, setEnabled] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; hints: string[] } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const selectedPreset = presets.find(p => p.id === selectedPresetId) ?? presets[0];

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSelectedPresetId(presets[0]?.id ?? 'transmission');
    setName('');
    setHost('');
    setPort(`${presets[0]?.defaultPort ?? 9091}`);
    setUsername('');
    setPassword('');
    setCategory('');
    setPriority(1);
    setEnabled(true);
    setValidationError(null);
    setTestResult(null);
  }, [isOpen, presets]);

  useEffect(() => {
    if (!selectedPreset) {
      return;
    }

    setPort(`${selectedPreset.defaultPort}`);
    setTestResult(null);
    setValidationError(null);
  }, [selectedPreset]);

  const buildDraft = (): DownloadClientDraft | null => {
    if (!selectedPreset) {
      setValidationError('No download client preset is available.');
      return null;
    }

    if (name.trim().length === 0) {
      setValidationError('Name is required.');
      return null;
    }

    if (host.trim().length === 0) {
      setValidationError('Host is required.');
      return null;
    }

    const portNumber = Number.parseInt(port, 10);
    if (Number.isNaN(portNumber) || portNumber < 1 || portNumber > 65535) {
      setValidationError('Port must be between 1 and 65535.');
      return null;
    }

    if (selectedPreset.requiresAuth) {
      if (username.trim().length === 0) {
        setValidationError('Username is required for this client type.');
        return null;
      }
      if (password.trim().length === 0) {
        setValidationError('Password is required for this client type.');
        return null;
      }
    }

    setValidationError(null);

    const settings: Record<string, unknown> = {
      host: host.trim(),
      port: portNumber,
    };

    if (username.trim()) {
      settings.username = username.trim();
    }

    if (password.trim()) {
      settings.password = password.trim();
    }

    if (category.trim()) {
      settings.category = category.trim();
    }

    return {
      name: name.trim(),
      implementation: selectedPreset.implementation,
      configContract: selectedPreset.configContract,
      protocol: selectedPreset.protocol,
      host: host.trim(),
      port,
      username: username.trim(),
      password: password.trim(),
      category: category.trim(),
      priority,
      enabled,
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

  const handleTestConnection = async () => {
    const draft = buildDraft();
    if (!draft) {
      return;
    }

    setIsTesting(true);
    try {
      const result = await onTestConnection(draft);
      setTestResult(result);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} ariaLabel="Add download client" onClose={onClose} maxWidthClassName="max-w-2xl">
      <ModalHeader title="Add Download Client" onClose={onClose} />
      <ModalBody>
        <Form onSubmit={handleSubmit}>
          <section className="space-y-2">
            <h3 className="text-sm font-medium text-text-primary">Client Type</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {presets.map(preset => {
                const selected = preset.id === selectedPresetId;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedPresetId(preset.id)}
                    className={`rounded-sm border px-3 py-2 text-left text-sm ${
                      selected
                        ? 'border-accent-primary bg-accent-primary/10 text-text-primary'
                        : 'border-border-subtle text-text-secondary'
                    }`}
                    aria-pressed={selected}
                  >
                    <p className="font-medium">{preset.name}</p>
                    <p className="text-xs">{preset.description}</p>
                  </button>
                );
              })}
            </div>
          </section>

          <FormGroup label="Name" htmlFor="add-download-client-name">
            <TextInput id="add-download-client-name" ariaLabel="Name" value={name} onChange={setName} />
          </FormGroup>

          <div className="grid gap-3 sm:grid-cols-2">
            <FormGroup label="Host" htmlFor="add-download-client-host">
              <TextInput
                id="add-download-client-host"
                ariaLabel="Host"
                placeholder="e.g., localhost or 192.168.1.1"
                value={host}
                onChange={setHost}
              />
            </FormGroup>
            <FormGroup label="Port" htmlFor="add-download-client-port">
              <NumberInput
                id="add-download-client-port"
                value={Number.parseInt(port, 10) || selectedPreset?.defaultPort || 9091}
                min={1}
                max={65535}
                onChange={value => setPort(String(value))}
              />
            </FormGroup>
          </div>

          {(selectedPreset?.requiresAuth ?? false) ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <FormGroup label="Username" htmlFor="add-download-client-username">
                <TextInput
                  id="add-download-client-username"
                  ariaLabel="Username"
                  value={username}
                  onChange={setUsername}
                />
              </FormGroup>
              <FormGroup label="Password" htmlFor="add-download-client-password">
                <TextInput
                  id="add-download-client-password"
                  ariaLabel="Password"
                  type="password"
                  value={password}
                  onChange={setPassword}
                />
              </FormGroup>
            </div>
          ) : null}

          <FormGroup label="Category (Optional)" htmlFor="add-download-client-category" hint="Default category for downloads">
            <TextInput
              id="add-download-client-category"
              ariaLabel="Category"
              placeholder="e.g., movies, tv, anime"
              value={category}
              onChange={setCategory}
            />
          </FormGroup>

          <div className="grid gap-3 sm:grid-cols-2">
            <FormGroup label="Priority" htmlFor="add-download-client-priority">
              <NumberInput
                id="add-download-client-priority"
                value={priority}
                min={1}
                max={50}
                onChange={setPriority}
              />
            </FormGroup>
            <div className="flex items-center gap-2 pt-6">
              <CheckInput id="add-download-client-enabled" label="Enabled" checked={enabled} onChange={setEnabled} />
            </div>
          </div>

          {validationError ? (
            <p role="alert" className="text-sm text-status-error">
              {validationError}
            </p>
          ) : null}

          {testResult ? (
            <section className="rounded-sm border border-border-subtle bg-surface-0 p-3 text-sm">
              <p className={testResult.success ? 'text-status-success' : 'text-status-error'}>{testResult.message}</p>
              {testResult.hints.length > 0 ? (
                <ul className="list-disc pl-4 text-text-secondary">
                  {testResult.hints.map((hint, index) => (
                    <li key={index}>{hint}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={isSubmitting || isTesting}>
          Cancel
        </Button>
        <Button variant="secondary" onClick={handleTestConnection} disabled={isSubmitting || isTesting}>
          {isTesting ? 'Testing...' : 'Test Connection'}
        </Button>
        <form onSubmit={handleSubmit}>
          <Button variant="primary" type="submit" disabled={isSubmitting || isTesting}>
            Add Client
          </Button>
        </form>
      </ModalFooter>
    </Modal>
  );
}
