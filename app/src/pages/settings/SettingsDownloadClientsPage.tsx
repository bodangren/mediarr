import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Folder } from 'lucide-react';
import { RouteScaffold } from '@/components/primitives/RouteScaffold';
import { FilesystemBrowser } from '@/components/primitives/FilesystemBrowser';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import type { TorrentLimitsSettings } from '@/lib/api/downloadClientsApi';

const downloadClientSchema = z.object({
  incompleteDirectory: z.string().min(1, 'Incomplete directory is required'),
  completeDirectory: z.string().min(1, 'Complete directory is required'),
  globalDownloadLimitKbps: z.coerce.number().min(0),
  globalUploadLimitKbps: z.coerce.number().min(0),
  maxActiveDownloads: z.coerce.number().int().min(0),
  seedRatioLimit: z.coerce.number().min(0),
  seedTimeLimitMinutes: z.coerce.number().int().min(0),
  seedLimitAction: z.enum(['pause', 'remove']),
});

type DownloadClientValues = z.infer<typeof downloadClientSchema>;

export function SettingsClientsPage() {
  const api = useMemo(() => getApiClients(), []);
  const { pushToast } = useToast();
  const [fullSettings, setFullSettings] = useState<TorrentLimitsSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeBrowser, setActiveBrowser] = useState<'incomplete' | 'complete' | null>(null);
  const [incompleteStatus, setIncompleteStatus] = useState<'writable' | 'readonly' | 'notfound' | null>(null);
  const [completeStatus, setCompleteStatus] = useState<'writable' | 'readonly' | 'notfound' | null>(null);

  const form = useForm<DownloadClientValues>({
    resolver: zodResolver(downloadClientSchema),
    defaultValues: {
      incompleteDirectory: '',
      completeDirectory: '',
      globalDownloadLimitKbps: 0,
      globalUploadLimitKbps: 0,
      maxActiveDownloads: 3,
      seedRatioLimit: 0,
      seedTimeLimitMinutes: 0,
      seedLimitAction: 'pause',
    },
  });

  const validateDirectory = useCallback(
    async (path: string, setStatus: (s: 'writable' | 'readonly' | 'notfound') => void) => {
      try {
        const result = await api.filesystemApi.list(path);
        setStatus(result.writable ? 'writable' : 'readonly');
      } catch {
        setStatus('notfound');
      }
    },
    [api.filesystemApi],
  );

  useEffect(() => {
    const load = async () => {
      setError(null);
      try {
        const value = await api.downloadClientApi.get();
        setFullSettings(value);
        form.reset({
          incompleteDirectory: value.incompleteDirectory,
          completeDirectory: value.completeDirectory,
          globalDownloadLimitKbps: value.globalDownloadLimitKbps ?? 0,
          globalUploadLimitKbps: value.globalUploadLimitKbps ?? 0,
          maxActiveDownloads: value.maxActiveDownloads,
          seedRatioLimit: value.seedRatioLimit,
          seedTimeLimitMinutes: value.seedTimeLimitMinutes,
          seedLimitAction: value.seedLimitAction,
        });
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load download client settings');
      }
    };

    void load();
  }, [api, form]);

  const onSubmit = async (data: DownloadClientValues) => {
    setIsSaving(true);
    setError(null);
    try {
      const updated = await api.downloadClientApi.save({
        maxActiveDownloads: data.maxActiveDownloads,
        maxActiveSeeds: fullSettings?.maxActiveSeeds ?? 3,
        globalDownloadLimitKbps: data.globalDownloadLimitKbps > 0 ? data.globalDownloadLimitKbps : null,
        globalUploadLimitKbps: data.globalUploadLimitKbps > 0 ? data.globalUploadLimitKbps : null,
        incompleteDirectory: data.incompleteDirectory,
        completeDirectory: data.completeDirectory,
        seedRatioLimit: data.seedRatioLimit,
        seedTimeLimitMinutes: data.seedTimeLimitMinutes,
        seedLimitAction: data.seedLimitAction,
      });
      setFullSettings(updated);
      form.reset({
        incompleteDirectory: updated.incompleteDirectory,
        completeDirectory: updated.completeDirectory,
        globalDownloadLimitKbps: updated.globalDownloadLimitKbps ?? 0,
        globalUploadLimitKbps: updated.globalUploadLimitKbps ?? 0,
        maxActiveDownloads: updated.maxActiveDownloads,
        seedRatioLimit: updated.seedRatioLimit,
        seedTimeLimitMinutes: updated.seedTimeLimitMinutes,
        seedLimitAction: updated.seedLimitAction,
      });
      pushToast({ title: 'Download Client settings saved.', variant: 'success' });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save download client settings');
    } finally {
      setIsSaving(false);
    }
  };

  const incompleteDirectory = form.watch('incompleteDirectory');
  const completeDirectory = form.watch('completeDirectory');

  return (
    <RouteScaffold title="Download Client" description="Integrated downloader settings for the built-in torrent client.">
      {error ? <p className="text-sm text-status-error">{error}</p> : null}
      <Form {...form}>
        <form
          className="rounded-md border border-border-subtle bg-surface-1 p-4 text-sm text-text-secondary"
          onSubmit={event => { void form.handleSubmit(onSubmit)(event); }}
        >
          {!fullSettings ? (
            <p>Loading settings...</p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <FormField
                control={form.control}
                name="incompleteDirectory"
                render={({ field }) => (
                  <FormItem className="text-sm text-text-secondary">
                    <FormLabel>Incomplete Directory</FormLabel>
                    <p className="text-xs text-text-secondary">Where downloading pieces are stored temporarily.</p>
                    <div className="mt-1 flex items-center gap-1">
                      <FormControl>
                        <Input
                          {...field}
                          onChange={event => { field.onChange(event); setIncompleteStatus(null); }}
                          className="min-w-0 flex-1 rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
                        />
                      </FormControl>
                      <Button type="button" variant="outline" size="icon-sm" aria-label="Browse incomplete directory" onClick={() => setActiveBrowser('incomplete')}>
                        <Folder size={16} />
                      </Button>
                      <Button type="button" variant="outline" size="xs" onClick={() => { void validateDirectory(field.value, setIncompleteStatus); }}>
                        Validate
                      </Button>
                    </div>
                    {incompleteStatus === 'writable' && <span className="mt-1 block text-xs text-green-500">Writable</span>}
                    {incompleteStatus === 'readonly' && <span className="mt-1 block text-xs text-yellow-500">Read-only</span>}
                    {incompleteStatus === 'notfound' && <span className="mt-1 block text-xs text-red-500">Not found</span>}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="completeDirectory"
                render={({ field }) => (
                  <FormItem className="text-sm text-text-secondary">
                    <FormLabel>Complete Directory</FormLabel>
                    <p className="text-xs text-text-secondary">Where finished torrents are moved after download.</p>
                    <div className="mt-1 flex items-center gap-1">
                      <FormControl>
                        <Input
                          {...field}
                          onChange={event => { field.onChange(event); setCompleteStatus(null); }}
                          className="min-w-0 flex-1 rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
                        />
                      </FormControl>
                      <Button type="button" variant="outline" size="icon-sm" aria-label="Browse complete directory" onClick={() => setActiveBrowser('complete')}>
                        <Folder size={16} />
                      </Button>
                      <Button type="button" variant="outline" size="xs" onClick={() => { void validateDirectory(field.value, setCompleteStatus); }}>
                        Validate
                      </Button>
                    </div>
                    {completeStatus === 'writable' && <span className="mt-1 block text-xs text-green-500">Writable</span>}
                    {completeStatus === 'readonly' && <span className="mt-1 block text-xs text-yellow-500">Read-only</span>}
                    {completeStatus === 'notfound' && <span className="mt-1 block text-xs text-red-500">Not found</span>}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="globalDownloadLimitKbps"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-text-secondary">Max Download Speed (KB/s, 0 = unlimited)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step={1} {...field} className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="globalUploadLimitKbps"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-text-secondary">Max Upload Speed (KB/s, 0 = unlimited)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step={1} {...field} className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxActiveDownloads"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-text-secondary">Max Active Downloads (0 = unlimited)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step={1} {...field} className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="seedRatioLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-text-secondary">Seed Ratio Limit (0 = unlimited)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step={0.01} {...field} className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="seedTimeLimitMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-text-secondary">Seed Time Limit (minutes, 0 = unlimited)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step={1} {...field} className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="seedLimitAction"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-text-secondary">When Seed Limit Reached</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pause">Pause torrent</SelectItem>
                        <SelectItem value="remove">Remove torrent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
          <div className="mt-4">
            <Button type="submit" variant="outline" size="sm" disabled={!fullSettings || isSaving}>
              {isSaving ? 'Saving...' : 'Save Download Client Settings'}
            </Button>
          </div>
        </form>
      </Form>
      <FilesystemBrowser
        isOpen={activeBrowser !== null}
        onClose={() => setActiveBrowser(null)}
        onSelect={(path) => {
          if (activeBrowser === 'incomplete') {
            form.setValue('incompleteDirectory', path);
            setIncompleteStatus(null);
          } else if (activeBrowser === 'complete') {
            form.setValue('completeDirectory', path);
            setCompleteStatus(null);
          }
          setActiveBrowser(null);
        }}
        initialPath={activeBrowser === 'incomplete' ? incompleteDirectory : completeDirectory}
      />
    </RouteScaffold>
  );
}
