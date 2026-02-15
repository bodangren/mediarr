'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Button } from '@/components/primitives/Button';
import { CheckInput, Form, FormGroup, SelectInput, TextInput } from '@/components/primitives/Form';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/primitives/Modal';
import { NumberInput } from '@/components/primitives/SpecialInputs';

type DynamicFieldType = 'text' | 'password' | 'number' | 'boolean';

interface DynamicFieldSchema {
  name: string;
  label: string;
  type: DynamicFieldType;
  required?: boolean;
  defaultValue?: string | number | boolean;
}

export interface DownloadClientPreset {
  id: string;
  name: string;
  description: string;
  protocol: 'torrent' | 'usenet';
  implementation: string;
  configContract: string;
  fields: DynamicFieldSchema[];
}

export interface AddDownloadClientDraft {
  presetId: string;
  name: string;
  implementation: string;
  configContract: string;
  protocol: 'torrent' | 'usenet';
  host: string;
  port: number;
  username?: string;
  password?: string;
  category?: string;
  priority: number;
  enabled: boolean;
  settings: Record<string, unknown>;
}

interface TestConnectionResult {
  success: boolean;
  message: string;
  hints: string[];
}

interface AddDownloadClientModalProps {
  isOpen: boolean;
  presets: DownloadClientPreset[];
  isSubmitting?: boolean;
  onClose: () => void;
  onCreate: (draft: AddDownloadClientDraft) => void | Promise<void>;
  onTestConnection: (draft: AddDownloadClientDraft) => Promise<TestConnectionResult>;
}

function normalizeFieldValue(field: DynamicFieldSchema): unknown {
  if (field.defaultValue !== undefined) {
    return field.defaultValue;
  }

  if (field.type === 'boolean') {
    return false;
  }

  if (field.type === 'number') {
    return 0;
  }

  return '';
}

export function AddDownloadClientModal({
  isOpen,
  presets,
  isSubmitting = false,
  onClose,
  onCreate,
  onTestConnection,
}: AddDownloadClientModalProps) {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [name, setName] = useState('');
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState(9091);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [category, setCategory] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [priority, setPriority] = useState(1);
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const selectedPreset = useMemo(() => {
    if (presets.length === 0) {
      return null;
    }

    const found = presets.find(item => item.id === selectedPresetId);
    return found ?? presets[0];
  }, [presets, selectedPresetId]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSelectedPresetId(presets[0]?.id ?? '');
    setName('');
    setHost('localhost');
    setPort(9091);
    setUsername('');
    setPassword('');
    setCategory('');
    setEnabled(true);
    setPriority(1);
    setValidationError(null);
    setTestResult(null);
  }, [isOpen, presets]);

  useEffect(() => {
    if (!selectedPreset) {
      setFieldValues({});
      return;
    }

    const nextValues = selectedPreset.fields.reduce<Record<string, unknown>>((accumulator, field) => {
      accumulator[field.name] = normalizeFieldValue(field);
      return accumulator;
    }, {});

    setFieldValues(nextValues);
    setTestResult(null);
    setValidationError(null);

    // Set default port based on client type
    const defaultPort = defaultPorts[selectedPreset.id] ?? 9091;
    setPort(defaultPort);
  }, [selectedPreset]);

  const defaultPorts: Record<string, number> = {
    transmission: 9091,
    qbittorrent: 8080,
    utorrent: 8080,
    deluge: 58846,
    sabnzbd: 8080,
  };

  const buildDraft = (): AddDownloadClientDraft | null => {
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

    if (port < 1 || port > 65535) {
      setValidationError('Port must be between 1 and 65535.');
      return null;
    }

    for (const field of selectedPreset.fields) {
      if (!field.required) {
        continue;
      }

      const value = fieldValues[field.name];
      if (field.type === 'boolean') {
        continue;
      }

      if (value === undefined || value === null || String(value).trim().length === 0) {
        setValidationError(`${field.label} is required.`);
        return null;
      }
    }

    setValidationError(null);

    return {
      presetId: selectedPreset.id,
      name: name.trim(),
      implementation: selectedPreset.implementation,
      configContract: selectedPreset.configContract,
      protocol: selectedPreset.protocol,
      host: host.trim(),
      port,
      username: username.trim() || undefined,
      password: password.trim() || undefined,
      category: category.trim() || undefined,
      enabled,
      priority,
      settings: fieldValues,
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
    <Modal isOpen={isOpen} ariaLabel="Add download client" onClose={onClose} maxWidthClassName="max-w-3xl">
      <ModalHeader title="Add Download Client" onClose={onClose} />
      <ModalBody>
        <Form onSubmit={handleSubmit}>
          <section className="space-y-2">
            <h3 className="text-sm font-medium text-text-primary">Client Type</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {presets.map(preset => {
                const selected = preset.id === selectedPreset?.id;
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

          <div className="grid gap-3 sm:grid-cols-2">
            <FormGroup label="Name" htmlFor="add-client-name">
              <TextInput id="add-client-name" ariaLabel="Name" value={name} onChange={setName} />
            </FormGroup>
            <FormGroup label="Priority" htmlFor="add-client-priority">
              <NumberInput id="add-client-priority" value={priority} min={1} max={50} onChange={setPriority} />
            </FormGroup>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <FormGroup label="Host" htmlFor="add-client-host">
              <TextInput id="add-client-host" ariaLabel="Host" value={host} onChange={setHost} />
            </FormGroup>
            <FormGroup label="Port" htmlFor="add-client-port">
              <NumberInput id="add-client-port" value={port} min={1} max={65535} onChange={setPort} />
            </FormGroup>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <FormGroup label="Username (optional)" htmlFor="add-client-username">
              <TextInput id="add-client-username" ariaLabel="Username" value={username} onChange={setUsername} />
            </FormGroup>
            <FormGroup label="Password (optional)" htmlFor="add-client-password">
              <TextInput id="add-client-password" ariaLabel="Password" type="password" value={password} onChange={setPassword} />
            </FormGroup>
          </div>

          <FormGroup label="Category (optional)" htmlFor="add-client-category">
            <TextInput id="add-client-category" ariaLabel="Category" value={category} onChange={setCategory} />
          </FormGroup>

          <div className="grid gap-2 sm:grid-cols-3">
            <CheckInput id="add-client-enabled" label="Enabled" checked={enabled} onChange={setEnabled} />
          </div>

          <section className="space-y-3">
            {selectedPreset?.fields.map(field => {
              const value = fieldValues[field.name];

              if (field.type === 'boolean') {
                return (
                  <CheckInput
                    key={field.name}
                    id={`add-client-${field.name}`}
                    label={field.label}
                    checked={Boolean(value)}
                    onChange={checked => {
                      setFieldValues(current => ({
                        ...current,
                        [field.name]: checked,
                      }));
                    }}
                  />
                );
              }

              if (field.type === 'number') {
                return (
                  <FormGroup key={field.name} label={field.label} htmlFor={`add-client-${field.name}`}>
                    <NumberInput
                      id={`add-client-${field.name}`}
                      value={typeof value === 'number' ? value : 0}
                      onChange={nextValue => {
                        setFieldValues(current => ({
                          ...current,
                          [field.name]: nextValue,
                        }));
                      }}
                    />
                  </FormGroup>
                );
              }

              return (
                <FormGroup key={field.name} label={field.label} htmlFor={`add-client-${field.name}`}>
                  <TextInput
                    id={`add-client-${field.name}`}
                    ariaLabel={field.label}
                    type={field.type === 'password' ? 'password' : 'text'}
                    value={typeof value === 'string' ? value : ''}
                    onChange={nextValue => {
                      setFieldValues(current => ({
                        ...current,
                        [field.name]: nextValue,
                      }));
                    }}
                  />
                </FormGroup>
              );
            })}
          </section>

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
            <Button variant="secondary" onClick={handleTestConnection} disabled={isSubmitting || isTesting}>
              {isTesting ? 'Testing...' : 'Test Connection'}
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmitting || isTesting}>
              Add Download Client
            </Button>
          </ModalFooter>
        </Form>
      </ModalBody>
    </Modal>
  );
}
