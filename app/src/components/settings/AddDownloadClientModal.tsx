
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
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
import type { TestConnectionResult } from '@/components/settings/ConfigurableItemModal';
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
  onTestConnection: (draft: DownloadClientDraft) => Promise<TestConnectionResult>;
}

const downloadClientSchema = z.object({
  presetId: z.string().min(1, 'Client type is required'),
  name: z.string().min(1, 'Name is required'),
  host: z.string().min(1, 'Host is required'),
  port: z.coerce.number().int().min(1, 'Port must be at least 1').max(65535, 'Port must be at most 65535'),
  username: z.string().optional(),
  password: z.string().optional(),
  category: z.string().optional(),
  priority: z.coerce.number().int().min(1).max(50),
  enabled: z.boolean(),
});

type FormValues = z.infer<typeof downloadClientSchema>;

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
  const form = useForm<FormValues>({
    resolver: zodResolver(downloadClientSchema),
    defaultValues: {
      presetId: presets[0]?.id ?? 'transmission',
      name: '',
      host: '',
      port: presets[0]?.defaultPort ?? 9091,
      username: '',
      password: '',
      category: '',
      priority: 1,
      enabled: true,
    },
  });

  const selectedPresetId = form.watch('presetId');
  const selectedPreset = presets.find(p => p.id === selectedPresetId) ?? presets[0];

  useEffect(() => {
    if (!isOpen) return;
    form.reset({
      presetId: presets[0]?.id ?? 'transmission',
      name: '',
      host: '',
      port: presets[0]?.defaultPort ?? 9091,
      username: '',
      password: '',
      category: '',
      priority: 1,
      enabled: true,
    });
  }, [isOpen, presets, form]);

  useEffect(() => {
    if (!selectedPreset) return;
    form.setValue('port', selectedPreset.defaultPort);
  }, [selectedPreset, form]);

  const buildDraft = (data: FormValues): DownloadClientDraft => {
    const preset = presets.find(p => p.id === data.presetId) ?? presets[0]!;
    return {
      name: data.name.trim(),
      implementation: preset.implementation,
      configContract: preset.configContract,
      protocol: preset.protocol,
      host: data.host.trim(),
      port: String(data.port),
      username: (data.username ?? '').trim(),
      password: (data.password ?? '').trim(),
      category: (data.category ?? '').trim(),
      priority: data.priority,
      enabled: data.enabled,
    };
  };

  const handleSubmit = async (data: FormValues) => {
    const draft = buildDraft(data);
    await onCreate(draft);
  };

  const handleTestConnection = async () => {
    const isValid = await form.trigger();
    if (!isValid) return;
    const data = form.getValues();
    const draft = buildDraft(data);
    await onTestConnection(draft);
  };

  return (
    <Modal isOpen={isOpen} ariaLabel="Add Download Client" onClose={onClose} maxWidthClassName="max-w-3xl">
      <ModalHeader title="Add Download Client" onClose={onClose} />
      <ModalBody>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="presetId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {presets.map(preset => (
                        <SelectItem key={preset.id} value={preset.id}>
                          {preset.name} — {preset.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Download Client" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="host"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Host</FormLabel>
                    <FormControl>
                      <Input placeholder="localhost" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="port"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Port</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={65535} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {selectedPreset?.requiresAuth && (
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., movies, tv, anime" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={50} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 pt-6">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="!mt-0">Enabled</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button variant="secondary" onClick={handleTestConnection} disabled={isSubmitting}>
          Test Connection
        </Button>
        <Button variant="default" onClick={form.handleSubmit(handleSubmit)} disabled={isSubmitting}>
          Add Client
        </Button>
      </ModalFooter>
    </Modal>
  );
}
