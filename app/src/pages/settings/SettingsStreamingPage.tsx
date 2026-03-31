import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { RouteScaffold } from '@/components/primitives/RouteScaffold';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { getApiClients } from '@/lib/api/client';

const streamingSettingsSchema = z.object({
  discoveryEnabled: z.boolean(),
  discoveryServiceName: z.string().min(1, 'Discovery service name is required'),
  defaultUserId: z.string().min(1, 'Default playback user id is required'),
  watchedThresholdPercent: z.coerce.number().min(1, 'Must be at least 1').max(100, 'Must be at most 100'),
  subtitleDirectory: z.string(),
});

type StreamingSettingsValues = z.infer<typeof streamingSettingsSchema>;

export function SettingsStreamingPage() {
  const api = useMemo(() => getApiClients(), []);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const form = useForm<StreamingSettingsValues>({
    resolver: zodResolver(streamingSettingsSchema),
    defaultValues: {
      discoveryEnabled: true,
      discoveryServiceName: 'Mediarr',
      defaultUserId: 'lan-default',
      watchedThresholdPercent: 90,
      subtitleDirectory: '',
    },
  });

  useEffect(() => {
    const load = async () => {
      setError(null);
      try {
        const settings = await api.settingsApi.get();
        const streaming = settings.streaming;
        form.reset({
          discoveryEnabled: streaming?.discoveryEnabled ?? true,
          discoveryServiceName: streaming?.discoveryServiceName ?? 'Mediarr',
          defaultUserId: streaming?.defaultUserId ?? 'lan-default',
          watchedThresholdPercent: Math.round((streaming?.watchedThreshold ?? 0.9) * 100),
          subtitleDirectory: streaming?.subtitleDirectory ?? '',
        });
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load streaming settings');
      } finally {
        setIsLoaded(true);
      }
    };

    void load();
  }, [api, form]);

  const onSubmit = async (data: StreamingSettingsValues) => {
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const normalizedSubtitleDirectory = data.subtitleDirectory.trim();
      const updated = await api.settingsApi.update({
        streaming: {
          discoveryEnabled: data.discoveryEnabled,
          discoveryServiceName: data.discoveryServiceName.trim(),
          defaultUserId: data.defaultUserId.trim(),
          watchedThreshold: data.watchedThresholdPercent / 100,
          subtitleDirectory: normalizedSubtitleDirectory.length > 0 ? normalizedSubtitleDirectory : null,
        },
      });

      const nextStreaming = updated.streaming ?? {
        discoveryEnabled: data.discoveryEnabled,
        discoveryServiceName: data.discoveryServiceName.trim(),
        defaultUserId: data.defaultUserId.trim(),
        watchedThreshold: data.watchedThresholdPercent / 100,
        subtitleDirectory: normalizedSubtitleDirectory.length > 0 ? normalizedSubtitleDirectory : null,
      };
      form.reset({
        discoveryEnabled: nextStreaming.discoveryEnabled,
        discoveryServiceName: nextStreaming.discoveryServiceName,
        defaultUserId: nextStreaming.defaultUserId,
        watchedThresholdPercent: Math.round(nextStreaming.watchedThreshold * 100),
        subtitleDirectory: nextStreaming.subtitleDirectory ?? '',
      });
      setMessage('Streaming settings saved.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save streaming settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <RouteScaffold title="Streaming" description="Playback and discovery settings for LAN streaming clients.">
      {error ? <p className="text-sm text-status-error">{error}</p> : null}
      {message ? <p className="text-sm text-text-secondary">{message}</p> : null}
      {!isLoaded ? <p className="text-sm text-text-secondary">Loading streaming settings...</p> : null}

      <Form {...form}>
        <form
          className="rounded-md border border-border-subtle bg-surface-1 p-4 text-sm text-text-secondary"
          onSubmit={event => { void form.handleSubmit(onSubmit)(event); }}
        >
          <FormField
            control={form.control}
            name="discoveryEnabled"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="text-sm text-text-secondary">Enable mDNS discovery broadcast</FormLabel>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="discoveryServiceName"
            render={({ field }) => (
              <FormItem className="mt-3">
                <FormLabel className="text-sm text-text-secondary">Discovery Service Name</FormLabel>
                <FormControl>
                  <Input {...field} className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="defaultUserId"
            render={({ field }) => (
              <FormItem className="mt-3">
                <FormLabel className="text-sm text-text-secondary">Default Playback User ID</FormLabel>
                <FormControl>
                  <Input {...field} className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="watchedThresholdPercent"
            render={({ field }) => (
              <FormItem className="mt-3">
                <FormLabel className="text-sm text-text-secondary">Watched Threshold (%)</FormLabel>
                <FormControl>
                  <Input type="number" min={1} max={100} {...field} className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary" />
                </FormControl>
                <FormDescription className="mt-1 text-xs text-text-secondary">
                  Media is marked watched once playback progress reaches this percentage.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="subtitleDirectory"
            render={({ field }) => (
              <FormItem className="mt-3">
                <FormLabel className="text-sm text-text-secondary">Subtitle Directory (Optional)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="/path/to/subtitles" className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary" />
                </FormControl>
                <FormDescription className="mt-1 text-xs text-text-secondary">
                  Additional root allowed for sidecar subtitle streaming.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <p className="mt-3 text-xs text-text-secondary">Discovery service changes apply on next server restart.</p>

          <div className="mt-3">
            <Button type="submit" variant="outline" size="sm" disabled={!isLoaded || isSaving}>
              {isSaving ? 'Saving...' : 'Save Streaming Settings'}
            </Button>
          </div>
        </form>
      </Form>
    </RouteScaffold>
  );
}
