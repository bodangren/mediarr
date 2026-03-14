
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { CheckInput, FormGroup, TextInput } from '@/components/ui/form-compat';
import { NumberInput } from '@/components/primitives/SpecialInputs';
import { ConfigurableItemModal } from '@/components/settings/ConfigurableItemModal';
import type { TestConnectionResult } from '@/components/settings/ConfigurableItemModal';

type DynamicFieldType = 'text' | 'password' | 'number' | 'boolean' | 'hidden';

interface DynamicFieldSchema {
  name: string;
  label: string;
  type: DynamicFieldType;
  required?: boolean;
  defaultValue?: string | number | boolean;
}

export interface IndexerPreset {
  id: string;
  name: string;
  description: string;
  protocol: string;
  implementation: string;
  configContract: string;
  privacy: 'Public' | 'SemiPrivate' | 'Private';
  fields: DynamicFieldSchema[];
}

export interface AddIndexerDraft {
  presetId: string;
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

interface AddIndexerModalProps {
  isOpen: boolean;
  presets: IndexerPreset[];
  isSubmitting?: boolean;
  onClose: () => void;
  onCreate: (draft: AddIndexerDraft) => void | Promise<void>;
  onTestConnection: (draft: AddIndexerDraft) => Promise<TestConnectionResult>;
  appProfiles?: Array<{ id: number; name: string }>;
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

export function AddIndexerModal({
  isOpen,
  presets,
  isSubmitting = false,
  onClose,
  onCreate,
  onTestConnection,
  appProfiles = [],
}: AddIndexerModalProps) {
  const [selectedPresetId, setSelectedPresetId] = useState(presets[0]?.id ?? '');
  const [name, setName] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [supportsRss, setSupportsRss] = useState(true);
  const [supportsSearch, setSupportsSearch] = useState(true);
  const [priority, setPriority] = useState(25);
  const [supportedMediaTypes, setSupportedMediaTypes] = useState('["TV", "MOVIE"]');
  const [appProfileId, setAppProfileId] = useState<number | undefined>(undefined);
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
    setEnabled(true);
    setSupportsRss(true);
    setSupportsSearch(true);
    setPriority(25);
    setSupportedMediaTypes('["TV", "MOVIE"]');
    setAppProfileId(undefined);
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
  }, [selectedPreset]);

  const buildDraft = (): AddIndexerDraft | null => {
    if (!selectedPreset) {
      setValidationError('No indexer preset is available.');
      return null;
    }

    if (name.trim().length === 0) {
      setValidationError('Name is required.');
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
      enabled,
      supportsRss,
      supportsSearch,
      priority,
      supportedMediaTypes,
      appProfileId,
      settings: fieldValues,
    };
  };

  const handleSubmit = async () => {
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

  const renderIndexerPresetGrid = (
    indexerPresets: IndexerPreset[],
    selectedId: string | undefined,
    onSelect: (id: string) => void,
  ) => (
    <>
      <h3 className="text-sm font-medium text-text-primary">Preset</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {indexerPresets.map(preset => {
          const selected = preset.id === selectedId;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelect(preset.id)}
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
    </>
  );

  const renderIndexerFields = (
    preset: IndexerPreset | undefined,
    values: Record<string, unknown>,
    onChange: (field: string, value: unknown) => void,
  ) => (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormGroup label="Name" htmlFor="add-indexer-name">
          <TextInput
            id="add-indexer-name"
            ariaLabel="Name"
            value={name}
            onChange={setName}
          />
        </FormGroup>
        <FormGroup label="Priority" htmlFor="add-indexer-priority">
          <NumberInput
            id="add-indexer-priority"
            value={priority}
            min={0}
            max={100}
            onChange={setPriority}
          />
        </FormGroup>
        <FormGroup label="Supported Media Types" htmlFor="add-indexer-supported-media-types">
          <TextInput
            id="add-indexer-supported-media-types"
            ariaLabel="Supported Media Types"
            value={supportedMediaTypes}
            onChange={setSupportedMediaTypes}
            placeholder='["TV", "MOVIE"]'
          />
        </FormGroup>
        <FormGroup label="App Profile" htmlFor="add-indexer-app-profile">
          <select
            id="add-indexer-app-profile"
            className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
            value={appProfileId ?? ''}
            onChange={(event) => {
              const nextValue = event.target.value;
              setAppProfileId(nextValue ? Number.parseInt(nextValue, 10) : undefined);
            }}
          >
            <option value="">None</option>
            {appProfiles.map((profile) => (
              <option key={profile.id} value={profile.id}>{profile.name}</option>
            ))}
          </select>
        </FormGroup>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <CheckInput id="add-indexer-enabled" label="Enabled" checked={enabled} onChange={setEnabled} />
        <CheckInput id="add-indexer-rss" label="RSS" checked={supportsRss} onChange={setSupportsRss} />
        <CheckInput id="add-indexer-search" label="Search" checked={supportsSearch} onChange={setSupportsSearch} />
      </div>

      <section className="space-y-3">
        {preset?.fields.filter(field => field.type !== 'hidden').map(field => {
          const value = values[field.name];

          if (field.type === 'boolean') {
            return (
              <CheckInput
                key={field.name}
                id={`add-indexer-${field.name}`}
                label={field.label}
                checked={Boolean(value)}
                onChange={checked => {
                  onChange(field.name, checked);
                }}
              />
            );
          }

          if (field.type === 'number') {
            return (
              <FormGroup key={field.name} label={field.label} htmlFor={`add-indexer-${field.name}`}>
                <NumberInput
                  id={`add-indexer-${field.name}`}
                  value={typeof value === 'number' ? value : 0}
                  onChange={nextValue => {
                    onChange(field.name, nextValue);
                  }}
                />
              </FormGroup>
            );
          }

          return (
            <FormGroup key={field.name} label={field.label} htmlFor={`add-indexer-${field.name}`}>
              <TextInput
                id={`add-indexer-${field.name}`}
                ariaLabel={field.label}
                type={field.type === 'password' ? 'password' : 'text'}
                value={typeof value === 'string' ? value : ''}
                onChange={nextValue => {
                  onChange(field.name, nextValue);
                }}
              />
            </FormGroup>
          );
        })}
      </section>
    </>
  );

  return (
    <ConfigurableItemModal<IndexerPreset, Record<string, unknown>>
      isOpen={isOpen}
      title="Add Indexer"
      presets={presets}
      selectedPresetId={selectedPresetId}
      fieldValues={fieldValues}
      isSubmitting={isSubmitting}
      isTesting={isTesting}
      testResult={testResult}
      error={validationError}
      saveButtonText="Add Indexer"
      onClose={onClose}
      onSelectPreset={setSelectedPresetId}
      onFieldChange={(field, value) => {
        setFieldValues(current => ({
          ...current,
          [field]: value,
        }));
      }}
      onTestConnection={handleTestConnection}
      onSave={handleSubmit}
      renderPresetGrid={renderIndexerPresetGrid}
      renderFields={renderIndexerFields}
    />
  );
}
