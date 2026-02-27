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
  host: {
    port: 9696,
    bindAddress: '*',
    urlBase: '',
    sslPort: 9697,
    enableSsl: false,
    sslCertPath: '',
    sslKeyPath: '',
  },
  security: {
    apiKey: '',
    authenticationMethod: 'none',
    authenticationRequired: false,
  },
  logging: {
    logLevel: 'info',
    logSizeLimit: 1048576,
    logRetentionDays: 30,
  },
  update: {
    branch: 'master',
    autoUpdateEnabled: false,
    mechanicsEnabled: false,
    updateScriptPath: '',
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
      host: {
        port: settings.host?.port ?? 9696,
        bindAddress: settings.host?.bindAddress ?? '*',
        urlBase: settings.host?.urlBase ?? '',
        sslPort: settings.host?.sslPort ?? 9697,
        enableSsl: settings.host?.enableSsl ?? false,
        sslCertPath: settings.host?.sslCertPath ?? '',
        sslKeyPath: settings.host?.sslKeyPath ?? '',
      },
      security: {
        apiKey: settings.security?.apiKey ?? '',
        authenticationMethod: settings.security?.authenticationMethod ?? 'none',
        authenticationRequired: settings.security?.authenticationRequired ?? false,
      },
      logging: {
        logLevel: settings.logging?.logLevel ?? 'info',
        logSizeLimit: settings.logging?.logSizeLimit ?? 1048576,
        logRetentionDays: settings.logging?.logRetentionDays ?? 30,
      },
      update: {
        branch: settings.update?.branch ?? 'master',
        autoUpdateEnabled: settings.update?.autoUpdateEnabled ?? false,
        mechanicsEnabled: settings.update?.mechanicsEnabled ?? false,
        updateScriptPath: settings.update?.updateScriptPath ?? '',
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

  const logSizeBytes = form.watch('logging.logSizeLimit');
  const logSizeMb = (logSizeBytes ?? 0) / 1048576;

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
          <p className="text-sm text-text-secondary">Host, security, logging, update, and general configuration.</p>
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
        <p className="text-sm text-text-secondary">Host, security, logging, update, and general configuration.</p>
      </header>

      <form className="space-y-4" onSubmit={submitSettings}>
        {/* Host Settings */}
        <section className="space-y-3 rounded-md border border-border-subtle bg-surface-1 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Host Configuration</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm" htmlFor="hostPort">
              <span>Port</span>
              <input
                id="hostPort"
                type="number"
                className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
                {...form.register('host.port', { valueAsNumber: true })}
              />
            </label>
            <label className="grid gap-1 text-sm" htmlFor="hostBindAddress">
              <span>Bind Address</span>
              <input
                id="hostBindAddress"
                type="text"
                className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
                placeholder="* or 0.0.0.0"
                {...form.register('host.bindAddress')}
              />
            </label>
            <label className="grid gap-1 text-sm" htmlFor="hostUrlBase">
              <span>URL Base</span>
              <input
                id="hostUrlBase"
                type="text"
                className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
                placeholder="/mediarr"
                {...form.register('host.urlBase')}
              />
            </label>
            <label className="grid gap-1 text-sm" htmlFor="hostSslPort">
              <span>SSL Port</span>
              <input
                id="hostSslPort"
                type="number"
                className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
                {...form.register('host.sslPort', { valueAsNumber: true })}
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...form.register('host.enableSsl')} />
            Enable SSL
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm" htmlFor="hostSslCertPath">
              <span>SSL Certificate Path</span>
              <input
                id="hostSslCertPath"
                type="text"
                className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm font-mono"
                {...form.register('host.sslCertPath')}
              />
            </label>
            <label className="grid gap-1 text-sm" htmlFor="hostSslKeyPath">
              <span>SSL Key Path</span>
              <input
                id="hostSslKeyPath"
                type="text"
                className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm font-mono"
                {...form.register('host.sslKeyPath')}
              />
            </label>
          </div>
        </section>

        {/* Security Settings */}
        <section className="space-y-3 rounded-md border border-border-subtle bg-surface-1 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Security</h2>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...form.register('security.authenticationRequired')} />
            Authentication Required
          </label>
          <label className="grid gap-1 text-sm" htmlFor="securityAuthenticationMethod">
            <span>Authentication Method</span>
            <select
              id="securityAuthenticationMethod"
              className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
              {...form.register('security.authenticationMethod')}
            >
              <option value="none">None</option>
              <option value="basic">Basic (External)</option>
              <option value="form">Form (Built-in)</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm" htmlFor="securityApiKey">
            <span>API Key</span>
            <input
              id="securityApiKey"
              type="password"
              className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm font-mono"
              {...form.register('security.apiKey')}
            />
          </label>
        </section>

        {/* Logging Settings */}
        <section className="space-y-3 rounded-md border border-border-subtle bg-surface-1 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Logging</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="grid gap-1 text-sm" htmlFor="loggingLogLevel">
              <span>Log Level</span>
              <select
                id="loggingLogLevel"
                className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
                {...form.register('logging.logLevel')}
              >
                <option value="trace">Trace</option>
                <option value="debug">Debug</option>
                <option value="info">Info</option>
                <option value="warn">Warning</option>
                <option value="error">Error</option>
                <option value="fatal">Fatal</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm" htmlFor="loggingLogSizeLimit">
              <span>Log Size Limit (MB)</span>
              <input
                id="loggingLogSizeLimit"
                type="number"
                className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
                value={logSizeMb}
                onChange={(e) => {
                  const mb = Number.parseFloat(e.target.value);
                  form.setValue('logging.logSizeLimit', (Number.isNaN(mb) ? 0 : mb) * 1048576);
                }}
              />
            </label>
            <label className="grid gap-1 text-sm" htmlFor="loggingLogRetentionDays">
              <span>Retention (Days)</span>
              <input
                id="loggingLogRetentionDays"
                type="number"
                className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
                {...form.register('logging.logRetentionDays', { valueAsNumber: true })}
              />
            </label>
          </div>
        </section>

        {/* Update Settings */}
        <section className="space-y-3 rounded-md border border-border-subtle bg-surface-1 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Updates</h2>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...form.register('update.autoUpdateEnabled')} />
            Enable Automatic Updates
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...form.register('update.mechanicsEnabled')} />
            Enable Update Mechanics
          </label>
          <label className="grid gap-1 text-sm" htmlFor="updateBranch">
            <span>Update Branch</span>
            <select
              id="updateBranch"
              className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
              {...form.register('update.branch')}
            >
              <option value="master">Master (Stable)</option>
              <option value="develop">Develop (Testing)</option>
              <option value="phantom">Phantom (Nightly)</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm" htmlFor="updateScriptPath">
            <span>Update Script Path</span>
            <input
              id="updateScriptPath"
              type="text"
              className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm font-mono"
              {...form.register('update.updateScriptPath')}
            />
          </label>
        </section>

        {/* Torrent Limits */}
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

        {/* Scheduler */}
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

        {/* Visibility & API Keys */}
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
