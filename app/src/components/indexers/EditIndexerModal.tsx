
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

const editIndexerFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  protocol: z.enum(['torrent', 'usenet']),
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

type EditIndexerFormValues = z.infer<typeof editIndexerFormSchema>;

export function EditIndexerModal({
  isOpen,
  indexer,
  isSubmitting = false,
  onClose,
  onSave,
  appProfiles = [],
}: EditIndexerModalProps) {
  const initialSettings = parseSettings(indexer.settings);

  const form = useForm<EditIndexerFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- zodResolver generic inference mismatch with useFieldArray
    resolver: zodResolver(editIndexerFormSchema) as any,
    defaultValues: {
      name: indexer.name,
      protocol: indexer.protocol === 'usenet' ? 'usenet' : 'torrent',
      enabled: indexer.enabled,
      supportsRss: indexer.supportsRss,
      supportsSearch: indexer.supportsSearch,
      priority: indexer.priority,
      supportedMediaTypes: indexer.supportedMediaTypes || '["TV", "MOVIE"]',
      appProfileId: typeof indexer.appProfileId === 'number' ? indexer.appProfileId : null,
      dynamicFields: [],
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Control generic mismatches FormField's constrained type
  const control = form.control as any;
  const protocol = form.watch('protocol');
  const dynamicFields = form.watch('dynamicFields');

  const schema = useMemo(() => {
    return parseContractSchema(indexer.configContract, protocol, initialSettings);
  }, [indexer.configContract, protocol]);

  const dynamicFieldArray = useFieldArray({
    control,
    name: 'dynamicFields',
  });

  useEffect(() => {
    if (!isOpen) return;
    form.reset({
      name: indexer.name,
      protocol: indexer.protocol === 'usenet' ? 'usenet' : 'torrent',
      enabled: indexer.enabled,
      supportsRss: indexer.supportsRss,
      supportsSearch: indexer.supportsSearch,
      priority: indexer.priority,
      supportedMediaTypes: indexer.supportedMediaTypes || '["TV", "MOVIE"]',
      appProfileId: typeof indexer.appProfileId === 'number' ? indexer.appProfileId : null,
      dynamicFields: [],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, indexer]);

  useEffect(() => {
    const nextFields = schema
      .map(f => ({
        name: f.name,
        value: initialSettings[f.name] !== undefined
          ? initialSettings[f.name]
          : f.defaultValue !== undefined
            ? f.defaultValue
            : f.type === 'boolean' ? false : f.type === 'number' ? 0 : '',
      }));
    dynamicFieldArray.replace(nextFields);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema]);

  const getDynamicFieldValue = (fieldName: string): unknown => {
    const item = dynamicFields.find(f => f.name === fieldName);
    return item?.value;
  };

  const handleSubmit = async (data: EditIndexerFormValues) => {
    const normalizedSettings: Record<string, unknown> = {};
    for (const field of schema) {
      normalizedSettings[field.name] = getDynamicFieldValue(field.name);
    }

    await onSave({
      id: indexer.id,
      name: data.name.trim(),
      implementation: indexer.implementation,
      configContract: indexer.configContract,
      protocol: data.protocol,
      appProfileId: data.appProfileId ?? undefined,
      enabled: data.enabled,
      supportsRss: data.supportsRss,
      supportsSearch: data.supportsSearch,
      priority: data.priority,
      supportedMediaTypes: data.supportedMediaTypes,
      settings: normalizedSettings,
    });
  };

  return (
    <Modal isOpen={isOpen} ariaLabel="Edit indexer" onClose={onClose} maxWidthClassName="max-w-3xl">
      <ModalHeader title="Edit Indexer" onClose={onClose} />
      <ModalBody>
        <Form {...form}>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <form onSubmit={form.handleSubmit(handleSubmit as any)} className="space-y-4">
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
                        id="edit-indexer-priority"
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
                name="protocol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Protocol</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="torrent">torrent</SelectItem>
                        <SelectItem value="usenet">usenet</SelectItem>
                      </SelectContent>
                    </Select>
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
                      onValueChange={field.onChange}
                      value={field.value ? String(field.value) : '__none__'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
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

            <section className="space-y-3">
              {schema.map((field, index) => {
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
                              id={`edit-indexer-${field.name}`}
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
                            id={`edit-indexer-${field.name}`}
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
          </form>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Button variant="default" onClick={() => form.handleSubmit(handleSubmit as any)()} disabled={isSubmitting}>
          Save Indexer
        </Button>
      </ModalFooter>
    </Modal>
  );
}
