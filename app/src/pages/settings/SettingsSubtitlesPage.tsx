import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { RouteScaffold } from '@/components/primitives/RouteScaffold';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { getApiClients } from '@/lib/api/client';
import type { SubtitleProvider } from '@/lib/api/subtitleProvidersApi';
import { COMMON_LANGUAGES, getLanguageName } from '@/lib/constants/languages';
import { normalizeLanguageCodes } from '@/lib/subtitles/coverage';

const subtitleSettingsSchema = z.object({
  openSubtitlesApiKey: z.string(),
  assrtApiToken: z.string(),
  subdlApiKey: z.string(),
  wantedLanguages: z.array(z.string()),
  showDownloadPath: z.boolean(),
  showMediaPath: z.boolean(),
});

type SubtitleSettingsValues = z.infer<typeof subtitleSettingsSchema>;

export function SettingsSubtitlesPage() {
  const api = useMemo(() => getApiClients(), []);
  const [providers, setProviders] = useState<SubtitleProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [providerLoadError, setProviderLoadError] = useState<string | null>(null);

  const form = useForm<SubtitleSettingsValues>({
    resolver: zodResolver(subtitleSettingsSchema),
    defaultValues: {
      openSubtitlesApiKey: '',
      assrtApiToken: '',
      subdlApiKey: '',
      wantedLanguages: [],
      showDownloadPath: false,
      showMediaPath: false,
    },
  });

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const settings = await api.settingsApi.get();
        form.reset({
          openSubtitlesApiKey: settings.apiKeys?.openSubtitlesApiKey ?? '',
          assrtApiToken: settings.apiKeys?.assrtApiToken ?? '',
          subdlApiKey: settings.apiKeys?.subdlApiKey ?? '',
          wantedLanguages: normalizeLanguageCodes(settings.wantedLanguages ?? []),
          showDownloadPath: settings.pathVisibility.showDownloadPath,
          showMediaPath: settings.pathVisibility.showMediaPath,
        });
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load subtitle settings');
      }

      try {
        const loadedProviders = await api.subtitleProvidersApi.listProviders();
        setProviders(loadedProviders);
        setProviderLoadError(null);
      } catch (providerError) {
        setProviders([]);
        setProviderLoadError(providerError instanceof Error ? providerError.message : 'Provider status endpoint unavailable');
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [api, form]);

  const toggleWantedLanguage = (languageCode: string) => {
    const current = form.getValues('wantedLanguages');
    const normalized = languageCode.trim().toLowerCase();
    if (current.includes(normalized)) {
      form.setValue('wantedLanguages', current.filter(item => item !== normalized));
    } else {
      form.setValue('wantedLanguages', normalizeLanguageCodes([...current, normalized]));
    }
  };

  const onSubmit = async (data: SubtitleSettingsValues) => {
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.settingsApi.update({
        apiKeys: {
          openSubtitlesApiKey: data.openSubtitlesApiKey.trim() === '' ? null : data.openSubtitlesApiKey.trim(),
          assrtApiToken: data.assrtApiToken.trim() === '' ? null : data.assrtApiToken.trim(),
          subdlApiKey: data.subdlApiKey.trim() === '' ? null : data.subdlApiKey.trim(),
        },
        wantedLanguages: normalizeLanguageCodes(data.wantedLanguages),
        pathVisibility: {
          showDownloadPath: data.showDownloadPath,
          showMediaPath: data.showMediaPath,
        },
      });
      setMessage('Subtitle settings saved.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save subtitle settings');
    } finally {
      setIsSaving(false);
    }
  };

  const wantedLanguages = form.watch('wantedLanguages');

  return (
    <RouteScaffold title="Subtitles" description="Unified subtitle providers and global behavior controls.">
      {error ? <p className="text-sm text-status-error">{error}</p> : null}
      {message ? <p className="text-sm text-text-secondary">{message}</p> : null}
      {isLoading ? <p className="text-sm text-text-secondary">Loading subtitle settings...</p> : null}
      <section className="rounded-md border border-border-subtle bg-surface-1 p-4">
        <h2 className="font-medium">Provider Status</h2>
        {providerLoadError ? <p className="mt-2 text-xs text-status-error">{providerLoadError}</p> : null}
        <ul className="mt-2 space-y-1 text-sm text-text-secondary">
          {providers.length === 0 ? <li>No provider status entries available.</li> : providers.map(provider => <li key={provider.id}>{provider.name} - {provider.status}</li>)}
        </ul>
      </section>

      <Form {...form}>
        <form className="rounded-md border border-border-subtle bg-surface-1 p-4" onSubmit={event => { void form.handleSubmit(onSubmit)(event); }}>
          <h2 className="font-medium">Provider Credentials and Visibility</h2>
          <FormField
            control={form.control}
            name="openSubtitlesApiKey"
            render={({ field }) => (
              <FormItem className="mt-3">
                <FormLabel className="text-sm text-text-secondary">OpenSubtitles API Key</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Paste OpenSubtitles API key"
                    className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="assrtApiToken"
            render={({ field }) => (
              <FormItem className="mt-3">
                <FormLabel className="text-sm text-text-secondary">ASSRT API Token</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Paste ASSRT token"
                    className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="subdlApiKey"
            render={({ field }) => (
              <FormItem className="mt-3">
                <FormLabel className="text-sm text-text-secondary">SubDL API Key</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Paste SubDL API key"
                    className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-medium text-text-primary">Wanted Languages</h3>
            <p className="text-xs text-text-secondary">
              Subtitles automation will prioritize these languages globally when no item-specific override exists.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="xs" onClick={() => form.setValue('wantedLanguages', normalizeLanguageCodes([...wantedLanguages, 'en']))}>
                Add English
              </Button>
              <Button type="button" variant="outline" size="xs" onClick={() => form.setValue('wantedLanguages', normalizeLanguageCodes([...wantedLanguages, 'zh']))}>
                Add Chinese
              </Button>
              <Button type="button" variant="outline" size="xs" onClick={() => form.setValue('wantedLanguages', normalizeLanguageCodes([...wantedLanguages, 'th']))}>
                Add Thai
              </Button>
              <Button type="button" variant="outline" size="xs" onClick={() => form.setValue('wantedLanguages', [])}>
                Clear
              </Button>
            </div>
            <div className="max-h-48 overflow-y-auto rounded-sm border border-border-subtle bg-surface-0 p-2">
              <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                {COMMON_LANGUAGES.map(language => (
                  <label key={language.code} className="flex items-center gap-2 rounded-sm px-2 py-1 text-xs text-text-secondary hover:bg-surface-1">
                    <input
                      type="checkbox"
                      aria-label={`Wanted language ${language.code}`}
                      checked={wantedLanguages.includes(language.code)}
                      onChange={() => toggleWantedLanguage(language.code)}
                    />
                    {language.name} ({language.code})
                  </label>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {wantedLanguages.length === 0 ? (
                <span className="text-xs text-text-muted">No wanted languages selected.</span>
              ) : wantedLanguages.map(code => (
                <span key={code} className="rounded-sm bg-surface-2 px-2 py-0.5 text-xs text-text-secondary">
                  {getLanguageName(code)} ({code})
                </span>
              ))}
            </div>
          </div>

          <FormField
            control={form.control}
            name="showDownloadPath"
            render={({ field }) => (
              <FormItem className="mt-3 flex items-center gap-2">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="text-sm text-text-secondary">Show download paths in subtitle-related views</FormLabel>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="showMediaPath"
            render={({ field }) => (
              <FormItem className="mt-2 flex items-center gap-2">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="text-sm text-text-secondary">Show media paths in subtitle-related views</FormLabel>
              </FormItem>
            )}
          />

          <div className="mt-3">
            <Button type="submit" variant="outline" size="sm" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Subtitle Settings'}
            </Button>
          </div>
        </form>
      </Form>
    </RouteScaffold>
  );
}
