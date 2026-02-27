import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { AppShell } from '@/components/shell/AppShell';
import { MovieInteractiveSearchModal } from '@/components/movie/MovieInteractiveSearchModal';
import { InteractiveSearchModal } from '@/components/search/InteractiveSearchModal';
import { MovieOverviewView, SeriesOverviewView } from '@/components/views';
import { getApiClients } from '@/lib/api/client';
import type { IndexerItem } from '@/lib/api/indexerApi';
import type { DownloadClientItem } from '@/lib/api/downloadClientsApi';
import type { QualityProfileItem } from '@/lib/api/qualityProfileApi';
import type { SubtitleProvider } from '@/lib/api/subtitleProvidersApi';
import type { NotificationItem } from '@/lib/api/notificationsApi';
import type { AppSettings } from '@/lib/api/settingsApi';
import type { MovieListItem as MovieViewItem } from '@/types/movie';
import type { SeriesListItem as SeriesViewItem } from '@/types/series';

function RouteScaffold({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return (
    <div className="space-y-4">
      <header className="rounded-md border border-border-subtle bg-surface-1 p-4">
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="text-sm text-text-secondary">{description}</p>
      </header>
      {children}
    </div>
  );
}

function StaticPage({ title, description }: { title: string; description: string }) {
  return <RouteScaffold title={title} description={description} />;
}

function SettingsMediaPage() {
  const api = useMemo(() => getApiClients(), []);
  const [movieRoots, setMovieRoots] = useState<string[]>([]);
  const [seriesRoots, setSeriesRoots] = useState<string[]>([]);
  const [movieNaming, setMovieNaming] = useState('{Movie Title} ({Release Year})/{Movie Title} ({Release Year})');
  const [seriesNaming, setSeriesNaming] = useState('{Series Title}/Season {season:00}/{Series Title} - S{season:00}E{episode:00}');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [movies, series] = await Promise.all([
        api.movieApi.getRootFolders(),
        api.seriesApi.getRootFolders(),
      ]);
      setMovieRoots(movies.rootFolders);
      setSeriesRoots(series.rootFolders);
    };

    void load();
  }, [api]);

  return (
    <RouteScaffold
      title="Media Management"
      description="Unified naming and root folder controls for movies and TV in one global settings page."
    >
      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-md border border-border-subtle bg-surface-1 p-4">
          <h2 className="font-medium">Naming - Movies</h2>
          <textarea
            value={movieNaming}
            onChange={event => setMovieNaming(event.target.value)}
            className="mt-2 min-h-24 w-full rounded-sm border border-border-subtle bg-surface-0 p-2 text-sm"
          />
        </article>
        <article className="rounded-md border border-border-subtle bg-surface-1 p-4">
          <h2 className="font-medium">Naming - TV Shows</h2>
          <textarea
            value={seriesNaming}
            onChange={event => setSeriesNaming(event.target.value)}
            className="mt-2 min-h-24 w-full rounded-sm border border-border-subtle bg-surface-0 p-2 text-sm"
          />
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-md border border-border-subtle bg-surface-1 p-4">
          <h2 className="font-medium">Movie Root Folders</h2>
          <ul className="mt-2 space-y-1 text-sm text-text-secondary">
            {movieRoots.length === 0 ? <li>No movie root folders discovered yet.</li> : movieRoots.map(root => <li key={root}>{root}</li>)}
          </ul>
        </article>
        <article className="rounded-md border border-border-subtle bg-surface-1 p-4">
          <h2 className="font-medium">TV Root Folders</h2>
          <ul className="mt-2 space-y-1 text-sm text-text-secondary">
            {seriesRoots.length === 0 ? <li>No TV root folders discovered yet.</li> : seriesRoots.map(root => <li key={root}>{root}</li>)}
          </ul>
        </article>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded-sm border border-border-subtle bg-surface-2 px-3 py-2 text-sm"
          onClick={() => setMessage('Naming templates saved for this session.')}
        >
          Save Naming Templates
        </button>
        {message ? <span className="text-sm text-text-secondary">{message}</span> : null}
      </div>
    </RouteScaffold>
  );
}

function SettingsIndexersPage() {
  const api = useMemo(() => getApiClients(), []);
  const [indexers, setIndexers] = useState<IndexerItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [supportedMediaTypes, setSupportedMediaTypes] = useState('["TV","MOVIE"]');

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const items = await api.indexerApi.list();
      setIndexers(items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load indexers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await api.indexerApi.create({
      name,
      implementation: 'Torznab',
      configContract: 'TorznabSettings',
      protocol: 'torrent',
      settings: JSON.stringify({ url, apiKey }),
      supportedMediaTypes,
      enabled: true,
      supportsRss: true,
      supportsSearch: true,
      priority: 25,
    });
    setName('');
    setUrl('');
    setApiKey('');
    await load();
  };

  return (
    <RouteScaffold
      title="Indexers"
      description="Single global indexer list used by both movie and TV search via the monolith search aggregation service."
    >
      <form className="grid gap-2 rounded-md border border-border-subtle bg-surface-1 p-4 lg:grid-cols-4" onSubmit={event => { void onCreate(event); }}>
        <input value={name} onChange={event => setName(event.target.value)} placeholder="Name" className="rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm" required />
        <input value={url} onChange={event => setUrl(event.target.value)} placeholder="https://indexer/api" className="rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm" required />
        <input value={apiKey} onChange={event => setApiKey(event.target.value)} placeholder="API Key" className="rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm" required />
        <input value={supportedMediaTypes} onChange={event => setSupportedMediaTypes(event.target.value)} placeholder='["TV","MOVIE"]' className="rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm" />
        <button type="submit" className="rounded-sm border border-border-subtle bg-surface-2 px-3 py-2 text-sm lg:col-span-4">Add Indexer</button>
      </form>

      {error ? <p className="text-sm text-status-error">{error}</p> : null}
      {isLoading ? <p className="text-sm text-text-secondary">Loading indexers...</p> : null}

      <ul className="space-y-2">
        {indexers.map(indexer => (
          <li key={indexer.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border-subtle bg-surface-1 p-3">
            <div>
              <p className="font-medium">{indexer.name}</p>
              <p className="text-xs text-text-secondary">{indexer.implementation} / {indexer.protocol}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-sm border border-border-subtle px-2 py-1 text-xs"
                onClick={() => {
                  void api.indexerApi.update(indexer.id, { enabled: !indexer.enabled }).then(load);
                }}
              >
                {indexer.enabled ? 'Disable' : 'Enable'}
              </button>
              <button
                type="button"
                className="rounded-sm border border-border-subtle px-2 py-1 text-xs"
                onClick={() => {
                  void api.indexerApi.remove(indexer.id).then(load);
                }}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </RouteScaffold>
  );
}

function SettingsClientsPage() {
  const api = useMemo(() => getApiClients(), []);
  const [clients, setClients] = useState<DownloadClientItem[]>([]);
  const [name, setName] = useState('');
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState('8080');

  const load = async () => {
    const items = await api.downloadClientApi.list();
    setClients(items);
  };

  useEffect(() => {
    void load();
  }, []);

  const onCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await api.downloadClientApi.create({
      name,
      implementation: 'qBittorrent',
      configContract: 'qBittorrentSettings',
      settings: JSON.stringify({ host, port: Number.parseInt(port, 10) }),
      protocol: 'torrent',
      host,
      port: Number.parseInt(port, 10),
      priority: 25,
      enabled: true,
    });
    setName('');
    await load();
  };

  return (
    <RouteScaffold title="Download Clients" description="Unified global download client management across all media domains.">
      <form className="grid gap-2 rounded-md border border-border-subtle bg-surface-1 p-4 lg:grid-cols-4" onSubmit={event => { void onCreate(event); }}>
        <input value={name} onChange={event => setName(event.target.value)} placeholder="Client name" className="rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm" required />
        <input value={host} onChange={event => setHost(event.target.value)} placeholder="Host" className="rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm" required />
        <input value={port} onChange={event => setPort(event.target.value)} placeholder="Port" className="rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm" required />
        <button type="submit" className="rounded-sm border border-border-subtle bg-surface-2 px-3 py-2 text-sm">Add Client</button>
      </form>

      <ul className="space-y-2">
        {clients.map(client => (
          <li key={client.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border-subtle bg-surface-1 p-3">
            <div>
              <p className="font-medium">{client.name}</p>
              <p className="text-xs text-text-secondary">{client.host}:{client.port} ({client.protocol})</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-sm border border-border-subtle px-2 py-1 text-xs"
                onClick={() => {
                  void api.downloadClientApi.update(client.id, { enabled: !client.enabled }).then(load);
                }}
              >
                {client.enabled ? 'Disable' : 'Enable'}
              </button>
              <button
                type="button"
                className="rounded-sm border border-border-subtle px-2 py-1 text-xs"
                onClick={() => {
                  void api.downloadClientApi.remove(client.id).then(load);
                }}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </RouteScaffold>
  );
}

function SettingsProfilesPage() {
  const api = useMemo(() => getApiClients(), []);
  const [qualityProfiles, setQualityProfiles] = useState<QualityProfileItem[]>([]);
  const [customFormats, setCustomFormats] = useState<Array<{ id: number; name: string; conditionCount: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [newProfileName, setNewProfileName] = useState('');
  const [templateProfileId, setTemplateProfileId] = useState<number | null>(null);
  const [profileNameDrafts, setProfileNameDrafts] = useState<Record<number, string>>({});
  const [newFormatName, setNewFormatName] = useState('');

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [profiles, formats] = await Promise.all([
        api.qualityProfileApi.list(),
        api.customFormatApi.list(),
      ]);
      setQualityProfiles(profiles);
      setCustomFormats(formats.map(format => ({
        id: format.id,
        name: format.name,
        conditionCount: format.conditions.length,
      })));
      setProfileNameDrafts(Object.fromEntries(profiles.map(profile => [profile.id, profile.name])));
      setTemplateProfileId(current => {
        if (profiles.length === 0) {
          return null;
        }
        if (current === null || !profiles.some(profile => profile.id === current)) {
          return profiles[0].id;
        }
        return current;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load quality settings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [api]);

  const onCreateProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = newProfileName.trim();
    if (!name) {
      return;
    }

    const template = qualityProfiles.find(profile => profile.id === templateProfileId) ?? qualityProfiles[0];
    if (!template) {
      setError('Cannot create a profile until at least one template profile exists.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.qualityProfileApi.create({
        name,
        cutoff: template.cutoff,
        items: template.items,
        languageProfileId: template.languageProfileId,
      });
      setNewProfileName('');
      await load();
      setMessage(`Created quality profile "${name}".`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create quality profile');
    } finally {
      setIsSaving(false);
    }
  };

  const saveProfileName = async (profileId: number) => {
    const name = profileNameDrafts[profileId]?.trim();
    if (!name) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.qualityProfileApi.update(profileId, { name });
      await load();
      setMessage(`Updated profile name to "${name}".`);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update quality profile');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteProfile = async (profileId: number) => {
    const profile = qualityProfiles.find(item => item.id === profileId);
    if (!profile) {
      return;
    }

    const confirmed = window.confirm(`Delete quality profile "${profile.name}"?`);
    if (!confirmed) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.qualityProfileApi.delete(profileId);
      await load();
      setMessage(`Deleted profile "${profile.name}".`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete quality profile');
    } finally {
      setIsSaving(false);
    }
  };

  const onCreateCustomFormat = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newFormatName.trim();
    if (!name) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.customFormatApi.create({
        name,
        includeCustomFormatWhenRenaming: false,
        conditions: [
          {
            type: 'regex',
            field: 'title',
            operator: 'contains',
            value: name,
            negate: false,
            required: false,
          },
        ],
        scores: [],
      });
      setNewFormatName('');
      await load();
      setMessage(`Created custom format "${name}".`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create custom format');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCustomFormat = async (formatId: number) => {
    const format = customFormats.find(item => item.id === formatId);
    if (!format) {
      return;
    }

    const confirmed = window.confirm(`Delete custom format "${format.name}"?`);
    if (!confirmed) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.customFormatApi.delete(formatId);
      await load();
      setMessage(`Deleted custom format "${format.name}".`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete custom format');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <RouteScaffold title="Profiles & Quality" description="Unified quality definitions, profiles, and custom formats shared globally.">
      {error ? <p className="text-sm text-status-error">{error}</p> : null}
      {message ? <p className="text-sm text-text-secondary">{message}</p> : null}
      {isLoading ? <p className="text-sm text-text-secondary">Loading quality settings...</p> : null}
      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-md border border-border-subtle bg-surface-1 p-4">
          <h2 className="font-medium">Quality Profiles</h2>
          <form className="mt-3 grid gap-2 lg:grid-cols-5" onSubmit={event => { void onCreateProfile(event); }}>
            <input
              value={newProfileName}
              onChange={event => setNewProfileName(event.target.value)}
              placeholder="New profile name"
              className="rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm lg:col-span-2"
              required
            />
            <select
              value={templateProfileId ?? ''}
              onChange={event => setTemplateProfileId(Number(event.target.value))}
              className="rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm lg:col-span-2"
              disabled={qualityProfiles.length === 0}
            >
              {qualityProfiles.map(profile => (
                <option key={profile.id} value={profile.id}>Template: {profile.name}</option>
              ))}
            </select>
            <button type="submit" className="rounded-sm border border-border-subtle bg-surface-2 px-3 py-2 text-sm" disabled={isSaving || qualityProfiles.length === 0}>
              Add
            </button>
          </form>
          <ul className="mt-3 space-y-2 text-sm text-text-secondary">
            {qualityProfiles.length === 0 ? <li>No quality profiles found.</li> : qualityProfiles.map(profile => (
              <li key={profile.id} className="rounded-sm border border-border-subtle bg-surface-0 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={profileNameDrafts[profile.id] ?? profile.name}
                    onChange={event => {
                      setProfileNameDrafts(current => ({ ...current, [profile.id]: event.target.value }));
                    }}
                    className="min-w-44 flex-1 rounded-sm border border-border-subtle bg-surface-1 px-2 py-1 text-sm text-text-primary"
                  />
                  <button
                    type="button"
                    className="rounded-sm border border-border-subtle px-2 py-1 text-xs"
                    onClick={() => {
                      void saveProfileName(profile.id);
                    }}
                    disabled={isSaving}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="rounded-sm border border-status-error/60 px-2 py-1 text-xs text-status-error"
                    onClick={() => {
                      void deleteProfile(profile.id);
                    }}
                    disabled={isSaving}
                  >
                    Delete
                  </button>
                </div>
                <p className="mt-2 text-xs text-text-secondary">Allowed qualities: {profile.items.filter(item => item.allowed).length} | Cutoff quality id: {profile.cutoff}</p>
              </li>
            ))}
          </ul>
        </article>
        <article className="rounded-md border border-border-subtle bg-surface-1 p-4">
          <h2 className="font-medium">Custom Formats</h2>
          <form className="mt-3 flex flex-wrap gap-2" onSubmit={event => { void onCreateCustomFormat(event); }}>
            <input
              value={newFormatName}
              onChange={event => setNewFormatName(event.target.value)}
              placeholder="New custom format name"
              className="min-w-44 flex-1 rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm"
              required
            />
            <button type="submit" className="rounded-sm border border-border-subtle bg-surface-2 px-3 py-2 text-sm" disabled={isSaving}>Add</button>
          </form>
          <ul className="mt-3 space-y-2 text-sm text-text-secondary">
            {customFormats.length === 0 ? <li>No custom formats found.</li> : customFormats.map(format => (
              <li key={format.id} className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-border-subtle bg-surface-0 p-3">
                <div>
                  <p className="font-medium text-text-primary">{format.name}</p>
                  <p className="text-xs text-text-secondary">Conditions: {format.conditionCount}</p>
                </div>
                <button
                  type="button"
                  className="rounded-sm border border-status-error/60 px-2 py-1 text-xs text-status-error"
                  onClick={() => {
                    void deleteCustomFormat(format.id);
                  }}
                  disabled={isSaving}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </RouteScaffold>
  );
}

function SettingsSubtitlesPage() {
  const api = useMemo(() => getApiClients(), []);
  const [providers, setProviders] = useState<SubtitleProvider[]>([]);
  const [openSubtitlesApiKey, setOpenSubtitlesApiKey] = useState('');
  const [showDownloadPath, setShowDownloadPath] = useState(false);
  const [showMediaPath, setShowMediaPath] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [providerLoadError, setProviderLoadError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const settings = await api.settingsApi.get();
        setOpenSubtitlesApiKey(settings.apiKeys?.openSubtitlesApiKey ?? '');
        setShowDownloadPath(settings.pathVisibility.showDownloadPath);
        setShowMediaPath(settings.pathVisibility.showMediaPath);
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
  }, [api]);

  const onSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.settingsApi.update({
        apiKeys: {
          openSubtitlesApiKey: openSubtitlesApiKey.trim() === '' ? null : openSubtitlesApiKey.trim(),
        },
        pathVisibility: {
          showDownloadPath,
          showMediaPath,
        },
      });
      setMessage('Subtitle settings saved.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save subtitle settings');
    } finally {
      setIsSaving(false);
    }
  };

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

      <form className="rounded-md border border-border-subtle bg-surface-1 p-4" onSubmit={event => { void onSave(event); }}>
        <h2 className="font-medium">Provider Credentials and Visibility</h2>
        <label className="mt-3 block text-sm text-text-secondary">
          OpenSubtitles API Key
          <input
            type="text"
            value={openSubtitlesApiKey}
            onChange={event => setOpenSubtitlesApiKey(event.target.value)}
            placeholder="Paste OpenSubtitles API key"
            className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
          />
        </label>
        <label className="mt-3 flex items-center gap-2 text-sm text-text-secondary">
          <input type="checkbox" checked={showDownloadPath} onChange={event => setShowDownloadPath(event.target.checked)} />
          Show download paths in subtitle-related views
        </label>
        <label className="mt-2 flex items-center gap-2 text-sm text-text-secondary">
          <input type="checkbox" checked={showMediaPath} onChange={event => setShowMediaPath(event.target.checked)} />
          Show media paths in subtitle-related views
        </label>
        <div className="mt-3">
          <button type="submit" className="rounded-sm border border-border-subtle bg-surface-2 px-3 py-2 text-sm" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Subtitle Settings'}
          </button>
        </div>
      </form>
    </RouteScaffold>
  );
}

function SettingsNotificationsPage() {
  const api = useMemo(() => getApiClients(), []);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    const load = async () => {
      const items = await api.notificationsApi.list();
      setNotifications(items);
    };

    void load();
  }, [api]);

  return (
    <RouteScaffold title="Notifications" description="Unified notification providers for movie, TV, and system events.">
      <ul className="space-y-2">
        {notifications.length === 0 ? <li className="rounded-md border border-border-subtle bg-surface-1 p-3 text-sm text-text-secondary">No notification integrations configured.</li> : notifications.map(item => (
          <li key={item.id} className="rounded-md border border-border-subtle bg-surface-1 p-3">
            <p className="font-medium">{item.name}</p>
            <p className="text-xs text-text-secondary">{item.type} - {item.enabled ? 'Enabled' : 'Disabled'}</p>
          </li>
        ))}
      </ul>
    </RouteScaffold>
  );
}

function SettingsGeneralPage() {
  const api = useMemo(() => getApiClients(), []);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [rssSyncMinutes, setRssSyncMinutes] = useState('');
  const [maxActiveDownloads, setMaxActiveDownloads] = useState('');
  const [maxActiveSeeds, setMaxActiveSeeds] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setError(null);
      try {
        const value = await api.settingsApi.get();
        setSettings(value);
        setRssSyncMinutes(String(value.schedulerIntervals.rssSyncMinutes));
        setMaxActiveDownloads(String(value.torrentLimits.maxActiveDownloads));
        setMaxActiveSeeds(String(value.torrentLimits.maxActiveSeeds));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load general settings');
      }
    };

    void load();
  }, [api]);

  const onSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!settings) {
      return;
    }

    const rss = Number.parseInt(rssSyncMinutes, 10);
    const downloads = Number.parseInt(maxActiveDownloads, 10);
    const seeds = Number.parseInt(maxActiveSeeds, 10);

    if (!Number.isFinite(rss) || rss <= 0 || !Number.isFinite(downloads) || downloads <= 0 || !Number.isFinite(seeds) || seeds <= 0) {
      setError('All values must be positive integers.');
      setMessage(null);
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await api.settingsApi.update({
        schedulerIntervals: {
          ...settings.schedulerIntervals,
          rssSyncMinutes: rss,
        },
        torrentLimits: {
          ...settings.torrentLimits,
          maxActiveDownloads: downloads,
          maxActiveSeeds: seeds,
        },
      });
      setSettings(updated);
      setRssSyncMinutes(String(updated.schedulerIntervals.rssSyncMinutes));
      setMaxActiveDownloads(String(updated.torrentLimits.maxActiveDownloads));
      setMaxActiveSeeds(String(updated.torrentLimits.maxActiveSeeds));
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
      <form className="rounded-md border border-border-subtle bg-surface-1 p-4 text-sm text-text-secondary" onSubmit={event => { void onSave(event); }}>
        {!settings ? (
          <p>Loading settings...</p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-3">
            <label className="text-sm text-text-secondary">
              RSS Sync Interval (minutes)
              <input
                type="number"
                min={1}
                value={rssSyncMinutes}
                onChange={event => setRssSyncMinutes(event.target.value)}
                className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
              />
            </label>
            <label className="text-sm text-text-secondary">
              Max Active Downloads
              <input
                type="number"
                min={1}
                value={maxActiveDownloads}
                onChange={event => setMaxActiveDownloads(event.target.value)}
                className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
              />
            </label>
            <label className="text-sm text-text-secondary">
              Max Active Seeds
              <input
                type="number"
                min={1}
                value={maxActiveSeeds}
                onChange={event => setMaxActiveSeeds(event.target.value)}
                className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
              />
            </label>
          </div>
        )}
        <div className="mt-3">
          <button type="submit" className="rounded-sm border border-border-subtle bg-surface-2 px-3 py-2 text-sm" disabled={!settings || isSaving}>
            {isSaving ? 'Saving...' : 'Save General Settings'}
          </button>
        </div>
      </form>
    </RouteScaffold>
  );
}

function DashboardPage() {
  return <StaticPage title="Dashboard" description="Unified overview across movies, TV, tasks, and system status." />;
}

function MoviesLibraryPage() {
  const api = useMemo(() => getApiClients(), []);
  const [movies, setMovies] = useState<MovieViewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchMovieId, setSearchMovieId] = useState<number | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const page = await api.mediaApi.listMovies({ page: 1, pageSize: 200 });
      setMovies(page.items as MovieViewItem[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load movies');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [api]);

  const selectedMovie = movies.find(movie => movie.id === searchMovieId) ?? null;

  return (
    <RouteScaffold title="Movies" description="Unified movie library view with interactive search and grab actions.">
      {error ? <p className="text-sm text-status-error">{error}</p> : null}
      <MovieOverviewView
        items={movies}
        isLoading={isLoading}
        onToggleMonitored={(id, monitored) => {
          void api.mediaApi.setMovieMonitored(id, monitored).then(load);
        }}
        onDelete={id => {
          void api.mediaApi.deleteMovie(id).then(load);
        }}
        onSearch={id => setSearchMovieId(id)}
      />
      {selectedMovie ? (
        <MovieInteractiveSearchModal
          isOpen
          onClose={() => setSearchMovieId(null)}
          movieId={selectedMovie.id}
          movieTitle={selectedMovie.title}
          movieYear={selectedMovie.year}
          imdbId={selectedMovie.imdbId}
          tmdbId={selectedMovie.tmdbId}
        />
      ) : null}
    </RouteScaffold>
  );
}

function MovieDetailPage() {
  const api = useMemo(() => getApiClients(), []);
  const params = useParams();
  const movieId = Number(params.id);
  const [movie, setMovie] = useState<{
    id: number;
    title: string;
    year?: number;
    overview?: string;
    status?: string;
    monitored: boolean;
    tmdbId?: number;
    imdbId?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(movieId)) {
      setError('Invalid movie id');
      setIsLoading(false);
      return;
    }

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const item = await api.movieApi.getById(movieId);
        setMovie({
          id: item.id,
          title: item.title,
          year: item.year,
          overview: item.overview,
          status: item.status,
          monitored: item.monitored,
          tmdbId: item.tmdbId,
          imdbId: item.imdbId,
        });
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load movie details');
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [api, movieId]);

  return (
    <RouteScaffold title="Movie Details" description="Details and interactive search for the selected movie.">
      {isLoading ? <p className="text-sm text-text-secondary">Loading movie...</p> : null}
      {error ? <p className="text-sm text-status-error">{error}</p> : null}
      {movie ? (
        <section className="space-y-3 rounded-md border border-border-subtle bg-surface-1 p-4">
          <h2 className="text-lg font-medium">{movie.title}</h2>
          <p className="text-sm text-text-secondary">Year: {movie.year ?? 'Unknown'} | Status: {movie.status ?? 'Unknown'} | Monitored: {movie.monitored ? 'Yes' : 'No'}</p>
          {movie.overview ? <p className="text-sm text-text-secondary">{movie.overview}</p> : null}
          <button
            type="button"
            className="rounded-sm border border-border-subtle bg-surface-2 px-3 py-2 text-sm"
            onClick={() => setSearchOpen(true)}
          >
            Interactive Search
          </button>
        </section>
      ) : null}
      {movie ? (
        <MovieInteractiveSearchModal
          isOpen={searchOpen}
          onClose={() => setSearchOpen(false)}
          movieId={movie.id}
          movieTitle={movie.title}
          movieYear={movie.year}
          imdbId={movie.imdbId}
          tmdbId={movie.tmdbId}
        />
      ) : null}
    </RouteScaffold>
  );
}

function SeriesLibraryPage() {
  const api = useMemo(() => getApiClients(), []);
  const [series, setSeries] = useState<SeriesViewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const page = await api.mediaApi.listSeries({ page: 1, pageSize: 200 });
      setSeries(page.items as SeriesViewItem[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load series');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [api]);

  return (
    <RouteScaffold title="TV Shows" description="Unified TV library view with monitoring controls and details access.">
      {error ? <p className="text-sm text-status-error">{error}</p> : null}
      <SeriesOverviewView
        items={series}
        onToggleMonitored={(id, monitored) => {
          void api.mediaApi.setSeriesMonitored(id, monitored).then(load);
        }}
        onDelete={id => {
          void api.mediaApi.deleteSeries(id).then(load);
        }}
        onRefresh={() => {
          void load();
        }}
      />
      {isLoading ? <p className="text-sm text-text-secondary">Loading series...</p> : null}
    </RouteScaffold>
  );
}

function SeriesDetailPage() {
  const api = useMemo(() => getApiClients(), []);
  const params = useParams();
  const seriesId = Number(params.id);
  const [series, setSeries] = useState<{
    id: number;
    title: string;
    seasons: Array<{ seasonNumber: number; episodes: Array<{ id: number; episodeNumber: number; title: string }> }>;
    tvdbId?: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(seriesId)) {
      setError('Invalid series id');
      setIsLoading(false);
      return;
    }

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const item = await api.seriesApi.getSeriesWithEpisodes(seriesId);
        setSeries({
          id: item.id,
          title: item.title,
          seasons: item.seasons,
          tvdbId: (item as { tvdbId?: number }).tvdbId,
        });
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load series details');
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [api, seriesId]);

  const firstSeason = series?.seasons[0]?.seasonNumber ?? 1;
  const episodeCount = series?.seasons.reduce((sum, season) => sum + season.episodes.length, 0) ?? 0;

  return (
    <RouteScaffold title="Series Details" description="Details and interactive search for the selected series.">
      {isLoading ? <p className="text-sm text-text-secondary">Loading series...</p> : null}
      {error ? <p className="text-sm text-status-error">{error}</p> : null}
      {series ? (
        <section className="space-y-3 rounded-md border border-border-subtle bg-surface-1 p-4">
          <h2 className="text-lg font-medium">{series.title}</h2>
          <p className="text-sm text-text-secondary">Seasons: {series.seasons.length} | Episodes: {episodeCount}</p>
          <button
            type="button"
            className="rounded-sm border border-border-subtle bg-surface-2 px-3 py-2 text-sm"
            onClick={() => setSearchOpen(true)}
          >
            Interactive Search
          </button>
        </section>
      ) : null}
      {series ? (
        <InteractiveSearchModal
          isOpen={searchOpen}
          onClose={() => setSearchOpen(false)}
          seriesId={series.id}
          tvdbId={series.tvdbId}
          episodeId={null}
          seriesTitle={series.title}
          seasonNumber={firstSeason}
        />
      ) : null}
    </RouteScaffold>
  );
}

function ShellWrapper({ children }: { children: ReactNode }) {
  const location = useLocation();
  return <AppShell pathname={location.pathname}>{children}</AppShell>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/*"
        element={
          <ShellWrapper>
            <Routes>
              <Route path="dashboard" element={<DashboardPage />} />

              <Route path="library/movies" element={<MoviesLibraryPage />} />
              <Route path="library/movies/:id" element={<MovieDetailPage />} />
              <Route path="library/tv" element={<SeriesLibraryPage />} />
              <Route path="library/tv/:id" element={<SeriesDetailPage />} />
              <Route path="library/series" element={<Navigate to="/library/tv" replace />} />
              <Route path="library/series/:id" element={<SeriesDetailPage />} />
              <Route path="library/collections" element={<StaticPage title="Collections" description="Unified collection management view." />} />

              <Route path="calendar" element={<StaticPage title="Calendar" description="Unified calendar for upcoming movie and TV activity." />} />

              <Route path="activity/queue" element={<StaticPage title="Queue" description="Unified download queue across all monitored media." />} />
              <Route path="activity/history" element={<StaticPage title="History" description="Unified activity history and release lifecycle events." />} />

              <Route path="settings" element={<Navigate to="/settings/media" replace />} />
              <Route path="settings/media" element={<SettingsMediaPage />} />
              <Route path="settings/profiles" element={<SettingsProfilesPage />} />
              <Route path="settings/indexers" element={<SettingsIndexersPage />} />
              <Route path="settings/clients" element={<SettingsClientsPage />} />
              <Route path="settings/subtitles" element={<SettingsSubtitlesPage />} />
              <Route path="settings/notifications" element={<SettingsNotificationsPage />} />
              <Route path="settings/general" element={<SettingsGeneralPage />} />

              <Route path="system/tasks" element={<StaticPage title="Tasks" description="Unified scheduled and queued background task management." />} />
              <Route path="system/logs" element={<StaticPage title="Logs" description="Unified system and application log access." />} />
              <Route path="system/backup" element={<StaticPage title="Backup" description="Unified backup and restore workflow." />} />
              <Route path="system/status" element={<Navigate to="/system/tasks" replace />} />

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </ShellWrapper>
        }
      />
    </Routes>
  );
}
