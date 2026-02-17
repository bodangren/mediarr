'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { addShortcutSaveListener } from '@/lib/shortcuts';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { useLocalStorage } from '@/lib/hooks/useLocalStorage';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { Alert } from '@/components/primitives/Alert';

// Subtitles-specific settings schema
const subtitlesSettingsSchema = z.object({
  autoDownload: z.boolean(),
  downloadOnUpgrade: z.boolean(),
  minimumScore: z.number().min(0).max(100),
  maxResultsPerLanguage: z.number().min(1).max(100),
  useCustomSubtitleFolder: z.boolean(),
  customSubtitleFolder: z.string().optional(),
  subtitleFolderMode: z.enum(['video', 'custom']),
  fileNamingFormat: z.string(),
  defaultLanguageProfileId: z.number().optional(),
  useEmbeddedSubtitles: z.boolean(),
  ignoreEmbeddedForHi: z.boolean(),
});

type SubtitlesSettingsFormData = z.infer<typeof subtitlesSettingsSchema>;

const DEFAULT_VALUES: SubtitlesSettingsFormData = {
  autoDownload: true,
  downloadOnUpgrade: true,
  minimumScore: 60,
  maxResultsPerLanguage: 10,
  useCustomSubtitleFolder: false,
  customSubtitleFolder: '',
  subtitleFolderMode: 'video',
  fileNamingFormat: '{movie_name}.{language_code}.{extension}',
  defaultLanguageProfileId: undefined,
  useEmbeddedSubtitles: false,
  ignoreEmbeddedForHi: true,
};

export default function SubtitlesSettingsPage() {
  const [localSettings, setLocalSettings] = useLocalStorage<SubtitlesSettingsFormData>(
    'mediarr:subtitle-settings',
    DEFAULT_VALUES
  );

  const form = useForm<SubtitlesSettingsFormData>({
    resolver: zodResolver(subtitlesSettingsSchema),
    defaultValues: localSettings,
  });

  const subtitleFolderMode = useWatch({ control: form.control, name: 'subtitleFolderMode' });

  // Fetch language profiles from API
  const { data: languageProfiles = [] } = useQuery({
    queryKey: queryKeys.languageProfiles(),
    queryFn: () => getApiClients().languageProfilesApi.listProfiles(),
    staleTime: 300_000, // 5 minutes
  });

  // Sync form values with localStorage
  useEffect(() => {
    form.reset(localSettings);
  }, [localSettings, form]);

  const submitSettings = form.handleSubmit(values => {
    setLocalSettings(values);
  });

  useEffect(() => {
    return addShortcutSaveListener(() => {
      void submitSettings();
    });
  }, [submitSettings]);

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Subtitle Settings</h1>
        <p className="text-sm text-text-secondary">Configure automatic subtitle downloads and file handling.</p>
      </header>

      <Alert variant="info">
        <span className="text-sm">Subtitle settings are stored locally in this browser.</span>
      </Alert>

      <form className="space-y-4" onSubmit={submitSettings}>
        {/* General Settings */}
        <section className="space-y-3 rounded-md border border-border-subtle bg-surface-1 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">General</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...form.register('autoDownload')} />
              <span>Download Automatically</span>
            </label>
            <p className="text-xs text-text-muted">
              Automatically download subtitles when a new video file is detected.
            </p>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...form.register('downloadOnUpgrade')} />
              <span>Download on Upgrade</span>
            </label>
            <p className="text-xs text-text-muted">
              Automatically search and download subtitles when an episode/movie is upgraded.
            </p>

            <label className="grid gap-1 text-sm" htmlFor="minimumScore">
              <span>Minimum Score</span>
              <input
                id="minimumScore"
                type="number"
                min="0"
                max="100"
                className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
                {...form.register('minimumScore', { valueAsNumber: true })}
              />
              <p className="text-xs text-text-muted">
                Only download subtitles with a score above this threshold.
              </p>
            </label>

            <label className="grid gap-1 text-sm" htmlFor="maxResultsPerLanguage">
              <span>Maximum Results Per Language</span>
              <input
                id="maxResultsPerLanguage"
                type="number"
                min="1"
                max="100"
                className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
                {...form.register('maxResultsPerLanguage', { valueAsNumber: true })}
              />
              <p className="text-xs text-text-muted">
                Limit the number of subtitle candidates to download for each language.
              </p>
            </label>
          </div>
        </section>

        {/* File Settings */}
        <section className="space-y-3 rounded-md border border-border-subtle bg-surface-1 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">File Settings</h2>
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  {...form.register('subtitleFolderMode')}
                  value="video"
                />
                <span>Save alongside video file</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  {...form.register('subtitleFolderMode')}
                  value="custom"
                />
                <span>Save in custom folder</span>
              </label>
            </div>

            {subtitleFolderMode === 'custom' && (
              <label className="grid gap-1 text-sm" htmlFor="customSubtitleFolder">
                <span>Custom Subtitle Folder</span>
                <input
                  id="customSubtitleFolder"
                  type="text"
                  className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm font-mono"
                  placeholder="/path/to/subtitles"
                  {...form.register('customSubtitleFolder')}
                />
                <p className="text-xs text-text-muted">
                  Absolute path where subtitle files will be saved.
                </p>
              </label>
            )}

            <label className="grid gap-1 text-sm" htmlFor="fileNamingFormat">
              <span>File Naming Format</span>
              <input
                id="fileNamingFormat"
                type="text"
                className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm font-mono"
                {...form.register('fileNamingFormat')}
              />
              <p className="text-xs text-text-muted">
                Available variables: {'{movie_name}'}, {'{series_name}'}, {'{season}'}, {'{episode}'}, {'{language_code}'}, {'{extension}'}
              </p>
            </label>
          </div>
        </section>

        {/* Language Settings */}
        <section className="space-y-3 rounded-md border border-border-subtle bg-surface-1 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Language Settings</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...form.register('useEmbeddedSubtitles')} />
              <span>Use Embedded Subtitles</span>
            </label>
            <p className="text-xs text-text-muted">
              Extract and use subtitles embedded in video files.
            </p>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...form.register('ignoreEmbeddedForHi')} />
              <span>Ignore Embedded for Hearing Impaired</span>
            </label>
            <p className="text-xs text-text-muted">
              Ignore embedded subtitles marked as hearing impaired.
            </p>

            <label className="grid gap-1 text-sm" htmlFor="defaultLanguageProfileId">
              <span>Default Language Profile</span>
              <select
                id="defaultLanguageProfileId"
                className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
                {...form.register('defaultLanguageProfileId', { valueAsNumber: true })}
              >
                <option value="">Select a profile...</option>
                {languageProfiles.map(profile => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-text-muted">
                Default language profile to use for automatic downloads.
              </p>
            </label>
          </div>
        </section>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="rounded-sm bg-accent-primary px-4 py-2 text-sm font-semibold text-text-inverse disabled:opacity-60"
          >
            Save Subtitle Settings
          </button>
        </div>
      </form>
    </section>
  );
}
