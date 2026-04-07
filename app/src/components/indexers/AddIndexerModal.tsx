
import { useEffect, useMemo, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/modal';
import { NumberInput } from '@/components/primitives/SpecialInputs';
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

const indexerFormSchema = z.object({
  presetId: z.string().min(1, 'Preset is required'),
  name: z.string().min(1, 'Name is required'),
  enabled: z.boolean().default(true),
  supportsRss: z.boolean().default(true),
  supportsSearch: z.boolean().default(true),
  priority: z.coerce.number().int().min(0).max(100).default(25),
  supportedMediaTypes: z.string().default('["TV", "MOVIE"]'),
  appProfileId: z.coerce.number().optional().nullable(),
  dynamicFields: z.array(z.object({
    name: z.string(),
    value: z.unknown(),
  })),
});

type IndexerFormValues = z.infer<typeof indexerFormSchema>;

export function AddIndexerModal({
  isOpen,
  presets,
  isSubmitting = false,
  onClose,
  onCreate,
  onTestConnection,
  appProfiles = [],
}: AddIndexerModalProps) {
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const form = useForm<IndexerFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- zodResolver generic inference mismatch with useFieldArray
    resolver: zodResolver(indexerFormSchema) as any,
    defaultValues: {
      presetId: presets[0]?.id ?? '',
      name: '',
      enabled: true,
      supportsRss: true,
      supportsSearch: true,
      priority: 25,
      supportedMediaTypes: '["TV", "MOVIE"]',
      appProfileId: null,
      dynamicFields: [],
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Control generic mismatches FormField's constrained type
  const control = form.control as any;
  const selectedPresetId = form.watch('presetId');
  const dynamicFields = form.watch('dynamicFields');

  const selectedPreset = useMemo(() => {
    if (presets.length === 0) return null;
    const found = presets.find(item => item.id === selectedPresetId);
    return found ?? presets[0];
  }, [presets, selectedPresetId]);

  const dynamicFieldArray = useFieldArray({
    control,
    name: 'dynamicFields',
  });

  useEffect(() => {
    if (!isOpen) return;
    form.reset({
      presetId: presets[0]?.id ?? '',
      name: '',
      enabled: true,
      supportsRss: true,
      supportsSearch: true,
      priority: 25,
      supportedMediaTypes: '["TV", "MOVIE"]',
      appProfileId: null,
      dynamicFields: [],
    });
    setTestResult(null);
  }, [isOpen, presets, form]);

  useEffect(() => {
    if (!selectedPreset) {
      dynamicFieldArray.replace([]);
      return;
    }
    const nextFields = selectedPreset.fields
      .filter(f => f.type !== 'hidden')
      .map(f => ({
        name: f.name,
        value: f.defaultValue !== undefined
          ? f.defaultValue
          : f.type === 'boolean' ? false : f.type === 'number' ? 0 : '',
      }));
    dynamicFieldArray.replace(nextFields);
    setTestResult(null);
  }, [selectedPreset, dynamicFieldArray]);

  const getDynamicFieldValue = (fieldName: string): unknown => {
    const item = dynamicFields.find(f => f.name === fieldName);
    return item?.value;
  };

  const buildDraft = (data: IndexerFormValues): AddIndexerDraft | null => {
    if (!selectedPreset) return null;

    const settings: Record<string, unknown> = {};
    for (const field of selectedPreset.fields) {
      if (field.type === 'hidden') continue;
      settings[field.name] = getDynamicFieldValue(field.name);
    }

    return {
      presetId: selectedPreset.id,
      name: data.name.trim(),
      implementation: selectedPreset.implementation,
      configContract: selectedPreset.configContract,
      protocol: selectedPreset.protocol,
      enabled: data.enabled,
      supportsRss: data.supportsRss,
      supportsSearch: data.supportsSearch,
      priority: data.priority,
      supportedMediaTypes: data.supportedMediaTypes,
      appProfileId: data.appProfileId ?? undefined,
      settings,
    };
  };

  const handleSubmit = async (data: IndexerFormValues) => {
    const draft = buildDraft(data);
    if (!draft) return;
    await onCreate(draft);
  };

  const handleTestConnection = async () => {
    const isValid = await form.trigger();
    if (!isValid) return;
    const data = form.getValues();
    const draft = buildDraft(data);
    if (!draft) return;

    setIsTesting(true);
    try {
      const result = await onTestConnection(draft);
      setTestResult(result);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} ariaLabel="Add Indexer" onClose={onClose} maxWidthClassName="max-w-3xl">
      <ModalHeader title="Add Indexer" onClose={onClose} />
      <ModalBody>
        <Form {...form}>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <form onSubmit={form.handleSubmit(handleSubmit as any)} className="space-y-4">
            <section className="space-y-2">
              <h3 className="text-sm font-medium text-text-primary">Preset</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {presets.map(preset => {
                  const selected = preset.id === selectedPresetId;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => form.setValue('presetId', preset.id)}
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
              <FormField
                control={control}
                name="presetId"
                render={() => <FormMessage />}
              />
            </section>

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <FormControl>
                      <NumberInput
                        id="add-indexer-priority"
                        value={field.value ?? 25}
                        min={0}
                        max={100}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="supportedMediaTypes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supported Media Types</FormLabel>
                    <FormControl>
                      <Input placeholder='["TV", "MOVIE"]' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="appProfileId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>App Profile</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(v ? Number.parseInt(v, 10) : null)}
                      value={field.value ? String(field.value) : ''}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {appProfiles.map((profile) => (
                          <SelectItem key={profile.id} value={String(profile.id)}>{profile.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <FormField
                control={control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="!mt-0">Enabled</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="supportsRss"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="!mt-0">RSS</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="supportsSearch"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="!mt-0">Search</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {selectedPreset && (
              <section className="space-y-3">
                {selectedPreset.fields.filter(f => f.type !== 'hidden').map((field, index) => {
                  if (field.type === 'boolean') {
                    return (
                      <FormField
                        key={field.name}
                        control={control}
                        name={`dynamicFields.${index}.value`}
                        render={({ field: formField }) => (
                          <FormItem className="flex items-center gap-2">
                            <FormControl>
                              <Checkbox
                                checked={Boolean(formField.value)}
                                onCheckedChange={formField.onChange}
                              />
                            </FormControl>
                            <FormLabel className="!mt-0">{field.label}</FormLabel>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    );
                  }

                  if (field.type === 'number') {
                    return (
                      <FormField
                        key={field.name}
                        control={control}
                        name={`dynamicFields.${index}.value`}
                        render={({ field: formField }) => (
                          <FormItem>
                            <FormLabel>{field.label}</FormLabel>
                            <FormControl>
                              <NumberInput
                                id={`add-indexer-${field.name}`}
                                value={typeof formField.value === 'number' ? formField.value : 0}
                                onChange={formField.onChange}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    );
                  }

                  return (
                    <FormField
                      key={field.name}
                      control={control}
                      name={`dynamicFields.${index}.value`}
                      render={({ field: formField }) => (
                        <FormItem>
                          <FormLabel>{field.label}</FormLabel>
                          <FormControl>
                            <Input
                              id={`add-indexer-${field.name}`}
                              type={field.type === 'password' ? 'password' : 'text'}
                              value={typeof formField.value === 'string' ? formField.value : ''}
                              onChange={formField.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  );
                })}
              </section>
            )}

            {testResult && (
              <section className="rounded-sm border border-border-subtle bg-surface-0 p-3 text-sm">
                <p className={testResult.success ? 'text-status-success' : 'text-status-error'}>{testResult.message}</p>
                {testResult.hints && testResult.hints.length > 0 && (
                  <ul className="list-disc pl-4 text-text-secondary">
                    {testResult.hints.map((hint, i) => (
                      <li key={i}>{hint}</li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </form>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={isSubmitting || isTesting}>
          Cancel
        </Button>
        <Button variant="secondary" onClick={handleTestConnection} disabled={isSubmitting || isTesting}>
          {isTesting ? 'Testing...' : 'Test Connection'}
        </Button>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Button variant="default" onClick={() => form.handleSubmit(handleSubmit as any)()} disabled={isSubmitting || isTesting}>
          Add Indexer
        </Button>
      </ModalFooter>
    </Modal>
  );
}
