import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { RouteScaffold } from '@/components/primitives/RouteScaffold';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getApiClients } from '@/lib/api/client';

const generalSettingsSchema = z.object({
  rssSyncMinutes: z.coerce.number().int().min(1, 'Must be at least 1'),
  maxActiveDownloads: z.coerce.number().int().min(1, 'Must be at least 1'),
  maxActiveSeeds: z.coerce.number().int().min(1, 'Must be at least 1'),
});

type GeneralSettingsValues = z.infer<typeof generalSettingsSchema>;

export function SettingsGeneralPage() {
  const api = useMemo(() => getApiClients(), []);
  const [fullSettings, setFullSettings] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const form = useForm<GeneralSettingsValues>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      rssSyncMinutes: 1,
      maxActiveDownloads: 1,
      maxActiveSeeds: 1,
    },
  });

  useEffect(() => {
    const load = async () => {
      setError(null);
      try {
        const value = await api.settingsApi.get();
        setFullSettings(value);
        form.reset({
          rssSyncMinutes: value.schedulerIntervals.rssSyncMinutes,
          maxActiveDownloads: value.torrentLimits.maxActiveDownloads,
          maxActiveSeeds: value.torrentLimits.maxActiveSeeds,
        });
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load general settings');
      }
    };

    void load();
  }, [api, form]);

  const onSubmit = async (data: GeneralSettingsValues) => {
    if (!fullSettings) return;

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await api.settingsApi.update({
        schedulerIntervals: {
          ...fullSettings.schedulerIntervals,
          rssSyncMinutes: data.rssSyncMinutes,
        },
        torrentLimits: {
          ...fullSettings.torrentLimits,
          maxActiveDownloads: data.maxActiveDownloads,
          maxActiveSeeds: data.maxActiveSeeds,
        },
      });
      setFullSettings(updated);
      form.reset({
        rssSyncMinutes: updated.schedulerIntervals.rssSyncMinutes,
        maxActiveDownloads: updated.torrentLimits.maxActiveDownloads,
        maxActiveSeeds: updated.torrentLimits.maxActiveSeeds,
      });
      setMessage('General settings saved.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save general settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <RouteScaffold title="General" description="Global daemon and scheduler controls for the unified application.">
      {error ? <p className="text-sm text-status-error">{error}</p> : null}
      {message ? <p className="text-sm text-text-secondary">{message}</p> : null}
      <Form {...form}>
        <form
          className="rounded-md border border-border-subtle bg-surface-1 p-4 text-sm text-text-secondary"
          onSubmit={event => { void form.handleSubmit(onSubmit)(event); }}
        >
          {!fullSettings ? (
            <p>Loading settings...</p>
          ) : (
            <div className="grid gap-3 lg:grid-cols-3">
              <FormField
                control={form.control}
                name="rssSyncMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-text-secondary">RSS Sync Interval (minutes)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        {...field}
                        className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
                      />
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
                    <FormLabel className="text-sm text-text-secondary">Max Active Downloads</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        {...field}
                        className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxActiveSeeds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-text-secondary">Max Active Seeds</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        {...field}
                        className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
          <div className="mt-3">
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={!fullSettings || isSaving}
            >
              {isSaving ? 'Saving...' : 'Save General Settings'}
            </Button>
          </div>
        </form>
      </Form>
    </RouteScaffold>
  );
}
