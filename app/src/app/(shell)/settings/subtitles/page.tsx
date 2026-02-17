'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { addShortcutSaveListener } from '@/lib/shortcuts';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

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
  const queryClient = useQueryClient();
  const form = useForm<SubtitlesSettingsFormData>({
    resolver: zodResolver(subtitlesSettingsSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const subtitleFolderMode = useWatch({ control: form.control, name: 'subtitleFolderMode' });

  // Query to fetch existing settings (when backend API is ready)
  const { data: settings, isPending, isError, error, refetch } = useQuery({
    queryKey: ['subtitles-settings'],
    queryFn: async () => {
      // When backend is ready, uncomment this:
      // return getApiClients().subtitleSettingsApi.get();
      // For now, return default values
      return DEFAULT_VALUES;
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!settings) {
      return;
    }
    form.reset(settings);
  }, [form, settings]);

  const updateMutation = useMutation({
    mutationFn: (values: SubtitlesSettingsFormData) => {
      // When backend is ready, uncomment this:
      // return getApiClients().subtitleSettingsApi.update(values);
      // For now, simulate a successful update
      return Promise.resolve(values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtitles-settings'] });
    },
  });

  const submitSettings = form.handleSubmit(values => {
    updateMutation.mutate(values);
  });

  useEffect(() => {
    return addShortcutSaveListener(() => {
      void submitSettings();
    });
  }, [submitSettings]);

  if (isPending) {
    return (
      <div className="rounded-md border border-border-subtle bg-surface-1 p-4 text-sm text-text-secondary">
        Loading subtitle settings…
      </div>
    );
  }

  if (isError) {
    return (
      <section className="space-y-3">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Subtitle Settings</h1>
          <p className="text-sm text-text-secondary">Configure automatic subtitle downloads and file handling.</p>
        </header>
        <div className="rounded-md border border-status-error/50 bg-surface-danger p-4 text-sm text-text-primary">
          <p>Could not load settings: {error instanceof Error ? error.message : 'Unknown error'}</p>
          <button
            type="button"
            className="mt-3 rounded-sm border border-border-subtle px-3 py-1 text-xs"
            onClick={() => void refetch()}
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Subtitle Settings</h1>
        <p className="text-sm text-text-secondary">Configure automatic subtitle downloads and file handling.</p>
      </header>

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
                {/* When backend is ready, populate with actual profiles */}
                <option value="1">English (Default)</option>
                <option value="2">Spanish</option>
                <option value="3">French</option>
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
            disabled={updateMutation.isPending}
            className="rounded-sm bg-accent-primary px-4 py-2 text-sm font-semibold text-text-inverse disabled:opacity-60"
          >
            {updateMutation.isPending ? 'Saving…' : 'Save Subtitle Settings'}
          </button>
          {updateMutation.isSuccess ? (
            <span className="text-xs text-status-completed">Saved.</span>
          ) : null}
          {updateMutation.isError ? (
            <span className="text-xs text-status-error">
              Save failed: {updateMutation.error instanceof Error ? updateMutation.error.message : 'Unknown error'}
            </span>
          ) : null}
        </div>
      </form>
    </section>
  );
}
