'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { getApiClients } from '@/lib/api/client';
import type { AppSettings } from '@/lib/api/settingsApi';
import { settingsSchema, type SettingsFormData } from '@/lib/settings-schema';
import { addShortcutSaveListener } from '@/lib/shortcuts';

function toPayload(data: SettingsFormData): Partial<AppSettings> {
  return {
    ...data,
    torrentLimits: {
      ...data.torrentLimits,
      globalDownloadLimitKbps: data.torrentLimits.globalDownloadLimitKbps ?? null,
      globalUploadLimitKbps: data.torrentLimits.globalUploadLimitKbps ?? null,
    },
    apiKeys: {
      tmdbApiKey: data.apiKeys.tmdbApiKey ?? null,
      openSubtitlesApiKey: data.apiKeys.openSubtitlesApiKey ?? null,
    },
  };
}

const DEFAULT_VALUES: SettingsFormData = {
  torrentLimits: {
    maxActiveDownloads: 3,
    maxActiveSeeds: 3,
    globalDownloadLimitKbps: null,
    globalUploadLimitKbps: null,
  },
  schedulerIntervals: {
    rssSyncMinutes: 15,
    availabilityCheckMinutes: 30,
    torrentMonitoringSeconds: 5,
  },
  pathVisibility: {
    showDownloadPath: true,
    showMediaPath: true,
  },
  apiKeys: {
    tmdbApiKey: '',
    openSubtitlesApiKey: '',
  },
};

export default function GeneralSettingsPage() {
  const settingsApi = getApiClients().settingsApi;
  const queryClient = useQueryClient();

  const { data: settings, isPending, isError, error, refetch } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get(),
  });

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (!settings) {
      return;
    }

    form.reset({
      ...settings,
      apiKeys: {
        tmdbApiKey: settings.apiKeys?.tmdbApiKey ?? '',
        openSubtitlesApiKey: settings.apiKeys?.openSubtitlesApiKey ?? '',
      },
    });
  }, [form, settings]);

  const updateMutation = useMutation({
    mutationFn: (values: SettingsFormData) => settingsApi.update(toPayload(values)),
    onSuccess: next => {
      queryClient.setQueryData(['settings'], next);
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
    return <div className="rounded-md border border-border-subtle bg-surface-1 p-4 text-sm text-text-secondary">Loading general settings…</div>;
  }

  if (isError) {
    return (
      <section className="space-y-3">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">General Settings</h1>
          <p className="text-sm text-text-secondary">Host, scheduler, torrent limit, and API credential configuration.</p>
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
        <h1 className="text-2xl font-semibold">General Settings</h1>
        <p className="text-sm text-text-secondary">Host, scheduler, torrent limit, and API credential configuration.</p>
      </header>

      <form className="space-y-4" onSubmit={submitSettings}>
        <section className="space-y-3 rounded-md border border-border-subtle bg-surface-1 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Torrent Limits</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm" htmlFor="maxActiveDownloads">
              <span>Max Active Downloads</span>
              <input
                id="maxActiveDownloads"
                type="number"
                className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
                {...form.register('torrentLimits.maxActiveDownloads', { valueAsNumber: true })}
              />
            </label>
            <label className="grid gap-1 text-sm" htmlFor="maxActiveSeeds">
              <span>Max Active Seeds</span>
              <input
                id="maxActiveSeeds"
                type="number"
                className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
                {...form.register('torrentLimits.maxActiveSeeds', { valueAsNumber: true })}
              />
            </label>
            <label className="grid gap-1 text-sm" htmlFor="globalDownloadLimitKbps">
              <span>Global Download Limit (KB/s)</span>
              <input
                id="globalDownloadLimitKbps"
                type="number"
                className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
                {...form.register('torrentLimits.globalDownloadLimitKbps', {
                  setValueAs: value => (value === '' ? null : Number(value)),
                })}
              />
            </label>
            <label className="grid gap-1 text-sm" htmlFor="globalUploadLimitKbps">
              <span>Global Upload Limit (KB/s)</span>
              <input
                id="globalUploadLimitKbps"
                type="number"
                className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
                {...form.register('torrentLimits.globalUploadLimitKbps', {
                  setValueAs: value => (value === '' ? null : Number(value)),
                })}
              />
            </label>
          </div>
        </section>

        <section className="space-y-3 rounded-md border border-border-subtle bg-surface-1 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Scheduler</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="grid gap-1 text-sm" htmlFor="rssSyncMinutes">
              <span>RSS Sync (minutes)</span>
              <input
                id="rssSyncMinutes"
                type="number"
                className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
                {...form.register('schedulerIntervals.rssSyncMinutes', { valueAsNumber: true })}
              />
            </label>
            <label className="grid gap-1 text-sm" htmlFor="availabilityCheckMinutes">
              <span>Availability Check (minutes)</span>
              <input
                id="availabilityCheckMinutes"
                type="number"
                className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
                {...form.register('schedulerIntervals.availabilityCheckMinutes', { valueAsNumber: true })}
              />
            </label>
            <label className="grid gap-1 text-sm" htmlFor="torrentMonitoringSeconds">
              <span>Torrent Monitor (seconds)</span>
              <input
                id="torrentMonitoringSeconds"
                type="number"
                className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
                {...form.register('schedulerIntervals.torrentMonitoringSeconds', { valueAsNumber: true })}
              />
            </label>
          </div>
        </section>

        <section className="space-y-3 rounded-md border border-border-subtle bg-surface-1 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Visibility & API Keys</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...form.register('pathVisibility.showDownloadPath')} />
              Show download path in tables
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...form.register('pathVisibility.showMediaPath')} />
              Show media path in tables
            </label>
            <label className="grid gap-1 text-sm" htmlFor="tmdbApiKey">
              <span>TMDB API Key</span>
              <input
                id="tmdbApiKey"
                className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm font-mono"
                {...form.register('apiKeys.tmdbApiKey')}
              />
            </label>
            <label className="grid gap-1 text-sm" htmlFor="openSubtitlesApiKey">
              <span>OpenSubtitles API Key</span>
              <input
                id="openSubtitlesApiKey"
                className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm font-mono"
                {...form.register('apiKeys.openSubtitlesApiKey')}
              />
            </label>
          </div>
        </section>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="rounded-sm bg-accent-primary px-4 py-2 text-sm font-semibold text-text-inverse disabled:opacity-60"
          >
            {updateMutation.isPending ? 'Saving…' : 'Save General Settings'}
          </button>
          {updateMutation.isSuccess ? <span className="text-xs text-status-completed">Saved.</span> : null}
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
