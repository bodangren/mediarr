'use client';

import { useMemo, useState, type FormEvent } from 'react';
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

export interface EditDownloadClientSource {
  id: number;
  name: string;
  implementation: string;
  configContract: string;
  settings: string;
  protocol: 'torrent' | 'usenet';
  host: string;
  port: number;
  category: string | null;
  priority: number;
  enabled: boolean;
}

export interface EditDownloadClientDraft {
  id: number;
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

interface EditDownloadClientModalProps {
  isOpen: boolean;
  client: EditDownloadClientSource;
  isSubmitting?: boolean;
  onClose: () => void;
  onSave: (draft: EditDownloadClientDraft) => void | Promise<void>;
}

function parseSettings(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // The user can overwrite malformed values from the form.
  }

  return {};
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

function parseContractSchema(configContract: string, implementation: string): DynamicFieldSchema[] {
  if (implementation === 'Transmission') {
    return [
      { name: 'useSsl', label: 'Use SSL', type: 'boolean', required: false },
    ];
  }

  if (implementation === 'QBittorrent') {
    return [
      { name: 'useSsl', label: 'Use SSL', type: 'boolean', required: false },
    ];
  }

  if (implementation === 'Sabnzbd') {
    return [
      { name: 'apiKey', label: 'API Key', type: 'password', required: false },
    ];
  }

  return [];
}

export function EditDownloadClientModal({
  isOpen,
  client,
  isSubmitting = false,
  onClose,
  onSave,
}: EditDownloadClientModalProps) {
  const [name, setName] = useState(client.name);
  const [host, setHost] = useState(client.host);
  const [port, setPort] = useState(client.port);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [category, setCategory] = useState(client.category ?? '');
  const [enabled, setEnabled] = useState(client.enabled);
  const [priority, setPriority] = useState(client.priority);
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>(() => {
    const startingSchema = parseContractSchema(client.configContract, client.implementation);
    const defaults = startingSchema.reduce<Record<string, unknown>>((accumulator, field) => {
      accumulator[field.name] = normalizeFieldValue(field);
      return accumulator;
    }, {});
    return {
      ...defaults,
      ...parseSettings(client.settings),
    };
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  const schema = useMemo(() => {
    return parseContractSchema(client.configContract, client.implementation);
  }, [client.configContract, client.implementation]);

  const getFieldValue = (field: DynamicFieldSchema): unknown => {
    if (field.name in fieldValues) {
      return fieldValues[field.name];
    }

    return normalizeFieldValue(field);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (name.trim().length === 0) {
      setValidationError('Name is required.');
      return;
    }

    if (host.trim().length === 0) {
      setValidationError('Host is required.');
      return;
    }

    if (port < 1 || port > 65535) {
      setValidationError('Port must be between 1 and 65535.');
      return;
    }

    setValidationError(null);
    await onSave({
      id: client.id,
      name: name.trim(),
      implementation: client.implementation,
      configContract: client.configContract,
      protocol: client.protocol,
      host: host.trim(),
      port,
      username: username.trim() || undefined,
      password: password.trim() || undefined,
      category: category.trim() || undefined,
      enabled,
      priority,
      settings: schema.reduce<Record<string, unknown>>((accumulator, field) => {
        accumulator[field.name] = getFieldValue(field);
        return accumulator;
      }, {}),
    });
  };

  return (
    <Modal isOpen={isOpen} ariaLabel="Edit download client" onClose={onClose} maxWidthClassName="max-w-3xl">
      <ModalHeader title="Edit Download Client" onClose={onClose} />
      <ModalBody>
        <Form onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormGroup label="Name" htmlFor="edit-client-name">
              <TextInput id="edit-client-name" ariaLabel="Name" value={name} onChange={setName} />
            </FormGroup>
            <FormGroup label="Priority" htmlFor="edit-client-priority">
              <NumberInput id="edit-client-priority" value={priority} min={1} max={50} onChange={setPriority} />
            </FormGroup>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <FormGroup label="Host" htmlFor="edit-client-host">
              <TextInput id="edit-client-host" ariaLabel="Host" value={host} onChange={setHost} />
            </FormGroup>
            <FormGroup label="Port" htmlFor="edit-client-port">
              <NumberInput id="edit-client-port" value={port} min={1} max={65535} onChange={setPort} />
            </FormGroup>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <FormGroup label="Username (optional)" htmlFor="edit-client-username">
              <TextInput id="edit-client-username" ariaLabel="Username" value={username} onChange={setUsername} />
            </FormGroup>
            <FormGroup label="Password (optional)" htmlFor="edit-client-password">
              <TextInput id="edit-client-password" ariaLabel="Password" type="password" value={password} onChange={setPassword} />
            </FormGroup>
          </div>

          <FormGroup label="Category (optional)" htmlFor="edit-client-category">
            <TextInput id="edit-client-category" ariaLabel="Category" value={category} onChange={setCategory} />
          </FormGroup>

          <div className="grid gap-2 sm:grid-cols-3">
            <CheckInput id="edit-client-enabled" label="Enabled" checked={enabled} onChange={setEnabled} />
          </div>

          <section className="space-y-3">
            {schema.map(field => {
              const value = getFieldValue(field);

              if (field.type === 'boolean') {
                return (
                  <CheckInput
                    key={field.name}
                    id={`edit-client-${field.name}`}
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
                  <FormGroup key={field.name} label={field.label} htmlFor={`edit-client-${field.name}`}>
                    <NumberInput
                      id={`edit-client-${field.name}`}
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
                <FormGroup key={field.name} label={field.label} htmlFor={`edit-client-${field.name}`}>
                  <TextInput
                    id={`edit-client-${field.name}`}
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
