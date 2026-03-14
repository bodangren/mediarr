
import { useMemo, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { CheckInput, Form, FormGroup, SelectInput, TextInput } from '@/components/primitives/Form';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/modal';
import { NumberInput } from '@/components/primitives/SpecialInputs';

type DynamicFieldType = 'text' | 'password' | 'number' | 'boolean';

interface DynamicFieldSchema {
  name: string;
  label: string;
  type: DynamicFieldType;
  required?: boolean;
  defaultValue?: string | number | boolean;
}

export interface EditIndexerSource {
  id: number;
  name: string;
  implementation: string;
  configContract: string;
  settings: string;
  protocol: string;
  appProfileId?: number | null;
  enabled: boolean;
  supportsRss: boolean;
  supportsSearch: boolean;
  priority: number;
  supportedMediaTypes: string;
}

export interface EditIndexerDraft {
  id: number;
  name: string;
  implementation: string;
  configContract: string;
  protocol: string;
  appProfileId?: number;
  enabled: boolean;
  supportsRss: boolean;
  supportsSearch: boolean;
  priority: number;
  supportedMediaTypes: string;
  settings: Record<string, unknown>;
}

interface EditIndexerModalProps {
  isOpen: boolean;
  indexer: EditIndexerSource;
  isSubmitting?: boolean;
  onClose: () => void;
  onSave: (draft: EditIndexerDraft) => void | Promise<void>;
  appProfiles?: Array<{ id: number; name: string }>;
}

const torznabFields: DynamicFieldSchema[] = [
  { name: 'url', label: 'Indexer URL', type: 'text', required: true },
  { name: 'apiKey', label: 'API Key', type: 'password', required: true },
];

const usenetFields: DynamicFieldSchema[] = [
  { name: 'host', label: 'Host', type: 'text', required: true },
  { name: 'apiKey', label: 'API Key', type: 'password', required: true },
];

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

function toFieldLabel(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, value => value.toUpperCase());
}

function inferFieldType(name: string, value: unknown): DynamicFieldType {
  if (typeof value === 'boolean') {
    return 'boolean';
  }

  if (typeof value === 'number') {
    return 'number';
  }

  const normalized = name.toLowerCase();
  if (
    normalized.includes('password')
    || normalized.includes('apikey')
    || normalized.includes('token')
    || normalized.includes('cookie')
  ) {
    return 'password';
  }

  return 'text';
}

function buildCardigannSchemaFromSettings(parsedSettings: Record<string, unknown>): DynamicFieldSchema[] {
  const fields: DynamicFieldSchema[] = Object.entries(parsedSettings)
    .filter(([, value]) => typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
    .map(([name, value]) => ({
      name,
      label: toFieldLabel(name),
      type: inferFieldType(name, value),
      required: name === 'definitionId',
      defaultValue: value as string | number | boolean,
    }));

  if (!fields.some(field => field.name === 'definitionId')) {
    fields.unshift({
      name: 'definitionId',
      label: 'Definition ID',
      type: 'text',
      required: true,
      defaultValue: '',
    });
  }

  return fields;
}

function parseContractSchema(
  configContract: string,
  protocol: string,
  parsedSettings: Record<string, unknown>,
): DynamicFieldSchema[] {
  if (configContract === 'CardigannSettings') {
    return buildCardigannSchemaFromSettings(parsedSettings);
  }

  if (configContract === 'TorznabSettings') {
    return torznabFields;
  }

  if (configContract === 'NewznabSettings') {
    return usenetFields;
  }

  if (configContract.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(configContract) as unknown;
      if (Array.isArray(parsed)) {
        const normalized = parsed.flatMap((field): DynamicFieldSchema[] => {
          if (!field || typeof field !== 'object') {
            return [];
          }

          const nextField = field as Record<string, unknown>;
          const type = nextField.type;
          const name = nextField.name;
          if (
            typeof name !== 'string'
            || typeof nextField.label !== 'string'
            || (type !== 'text' && type !== 'password' && type !== 'number' && type !== 'boolean')
          ) {
            return [];
          }

          return [{
            name,
            label: nextField.label,
            type,
            required: Boolean(nextField.required),
          }];
        });

        if (normalized.length > 0) {
          return normalized;
        }
      }
    } catch {
      // Fallback handled below.
    }
  }

  return protocol === 'usenet' ? usenetFields : torznabFields;
}

export function EditIndexerModal({
  isOpen,
  indexer,
  isSubmitting = false,
  onClose,
  onSave,
  appProfiles = [],
}: EditIndexerModalProps) {
  const initialSettings = parseSettings(indexer.settings);
  const [name, setName] = useState(indexer.name);
  const [protocol, setProtocol] = useState<'torrent' | 'usenet'>(indexer.protocol === 'usenet' ? 'usenet' : 'torrent');
  const [configContract, setConfigContract] = useState(indexer.configContract);
  const [appProfileId, setAppProfileId] = useState<number | undefined>(
    typeof indexer.appProfileId === 'number' ? indexer.appProfileId : undefined,
  );
  const [enabled, setEnabled] = useState(indexer.enabled);
  const [supportsRss, setSupportsRss] = useState(indexer.supportsRss);
  const [supportsSearch, setSupportsSearch] = useState(indexer.supportsSearch);
  const [priority, setPriority] = useState(indexer.priority);
  const [supportedMediaTypes, setSupportedMediaTypes] = useState(indexer.supportedMediaTypes || '["TV", "MOVIE"]');
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>(() => {
    const startingSchema = parseContractSchema(indexer.configContract, indexer.protocol, initialSettings);
    const defaults = startingSchema.reduce<Record<string, unknown>>((accumulator, field) => {
      accumulator[field.name] = normalizeFieldValue(field);
      return accumulator;
    }, {});
    return {
      ...defaults,
      ...initialSettings,
    };
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  const schema = useMemo(() => {
    return parseContractSchema(configContract, protocol, fieldValues);
  }, [configContract, protocol, fieldValues]);

  const getFieldValue = (field: DynamicFieldSchema): unknown => {
    if (field.name in fieldValues) {
      return fieldValues[field.name];
    }

    return normalizeFieldValue(field);
  };

  const handleProtocolChange = (nextProtocol: string) => {
    const normalized = nextProtocol === 'usenet' ? 'usenet' : 'torrent';
    setProtocol(normalized);
    if (configContract === 'TorznabSettings' || configContract === 'NewznabSettings') {
      setConfigContract(normalized === 'usenet' ? 'NewznabSettings' : 'TorznabSettings');
    }
    setValidationError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (name.trim().length === 0) {
      setValidationError('Name is required.');
      return;
    }

    for (const field of schema) {
      if (!field.required || field.type === 'boolean') {
        continue;
      }

      const value = getFieldValue(field);
      if (value === undefined || value === null || String(value).trim().length === 0) {
        setValidationError(`${field.label} is required.`);
        return;
      }
    }

    setValidationError(null);
    const normalizedSettings = { ...fieldValues };
    for (const field of schema) {
      normalizedSettings[field.name] = getFieldValue(field);
    }

    await onSave({
      id: indexer.id,
      name: name.trim(),
      implementation: indexer.implementation,
      configContract,
      protocol,
      appProfileId,
      enabled,
      supportsRss,
      supportsSearch,
      priority,
      supportedMediaTypes,
      settings: normalizedSettings,
    });
  };

  return (
    <Modal isOpen={isOpen} ariaLabel="Edit indexer" onClose={onClose} maxWidthClassName="max-w-3xl">
      <ModalHeader title="Edit Indexer" onClose={onClose} />
      <ModalBody>
        <Form onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormGroup label="Name" htmlFor="edit-indexer-name">
              <TextInput id="edit-indexer-name" ariaLabel="Name" value={name} onChange={setName} />
            </FormGroup>
            <FormGroup label="Priority" htmlFor="edit-indexer-priority">
              <NumberInput id="edit-indexer-priority" value={priority} min={0} max={100} onChange={setPriority} />
            </FormGroup>
            <FormGroup label="Supported Media Types" htmlFor="edit-indexer-supported-media-types">
              <TextInput
                id="edit-indexer-supported-media-types"
                ariaLabel="Supported Media Types"
                value={supportedMediaTypes}
                onChange={setSupportedMediaTypes}
                placeholder='["TV", "MOVIE"]'
              />
            </FormGroup>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <SelectInput
              id="edit-indexer-protocol"
              label="Protocol"
              value={protocol}
              onChange={handleProtocolChange}
              options={[
                { value: 'torrent', label: 'torrent' },
                { value: 'usenet', label: 'usenet' },
              ]}
            />
            <label className="grid gap-1 text-sm">
              <span>App Profile</span>
              <select
                id="edit-indexer-app-profile"
                className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
                value={appProfileId ?? ''}
                onChange={(event) => {
                  const value = event.target.value;
                  setAppProfileId(value ? Number.parseInt(value, 10) : undefined);
                }}
              >
                <option value="">None</option>
                {appProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>{profile.name}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <CheckInput id="edit-indexer-enabled" label="Enabled" checked={enabled} onChange={setEnabled} />
            <CheckInput id="edit-indexer-rss" label="RSS" checked={supportsRss} onChange={setSupportsRss} />
            <CheckInput id="edit-indexer-search" label="Search" checked={supportsSearch} onChange={setSupportsSearch} />
          </div>

          <section className="space-y-3">
            {schema.map(field => {
              const value = getFieldValue(field);

              if (field.type === 'boolean') {
                return (
                  <CheckInput
                    key={field.name}
                    id={`edit-indexer-${field.name}`}
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
                  <FormGroup key={field.name} label={field.label} htmlFor={`edit-indexer-${field.name}`}>
                    <NumberInput
                      id={`edit-indexer-${field.name}`}
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
                <FormGroup key={field.name} label={field.label} htmlFor={`edit-indexer-${field.name}`}>
                  <TextInput
                    id={`edit-indexer-${field.name}`}
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
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <form onSubmit={handleSubmit}>
          <Button variant="default" type="submit" disabled={isSubmitting}>
            Save Indexer
          </Button>
        </form>
      </ModalFooter>
    </Modal>
  );
}
