import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '@/components/shell/AppShell';
import { DashboardPage } from '@/components/dashboard/DashboardPage';
import { useToast } from '@/components/providers/ToastProvider';
import { Folder, Search } from 'lucide-react';
import { AddIndexerModal } from '@/components/indexers/AddIndexerModal';
import { FilesystemBrowser } from '@/components/primitives/FilesystemBrowser';
import { AddProfileModal } from '@/components/settings/AddProfileModal';
import { EditIndexerModal } from '@/components/indexers/EditIndexerModal';
import { MovieInteractiveSearchModal } from '@/components/movie/MovieInteractiveSearchModal';
import { InteractiveSearchModal } from '@/components/search/InteractiveSearchModal';
import { SeriesInteractiveSearchModal, type SearchLevel } from '@/components/series/SeriesInteractiveSearchModal';
import { SeriesOverviewView, MovieOverviewView } from '@/components/views';
import { ImportWizard } from '@/components/import/ImportWizard';
import { ActivityQueuePage } from '@/components/activity/ActivityQueuePage';
import { ActivityHistoryPage } from '@/components/activity/ActivityHistoryPage';
import { CalendarPage } from '@/components/calendar/CalendarPage';
import { getApiClients } from '@/lib/api/client';
import { getPopularPresets } from '@/lib/indexer/indexerPresets';
import type { IndexerItem } from '@/lib/api/indexerApi';
import type { TorrentLimitsSettings } from '@/lib/api/downloadClientsApi';
import type { CreateQualityProfileInput, QualityProfileItem } from '@/lib/api/qualityProfileApi';
import type { SubtitleProvider } from '@/lib/api/subtitleProvidersApi';
import type { NotificationItem } from '@/lib/api/notificationsApi';
import type { AppSettings } from '@/lib/api/settingsApi';
import type { MetadataSearchResult } from '@/lib/api/mediaApi';
import type { MovieListItem as MovieViewItem } from '@/types/movie';
import type { SeriesListItem as SeriesViewItem } from '@/types/series';
import { formatBytes } from '@/lib/format';

function RouteScaffold({ title, description, actions, children }: { title: string; description: string; actions?: ReactNode; children?: ReactNode }) {
  return (
    <div className="space-y-4">
      <header className="rounded-md border border-border-subtle bg-surface-1 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">{title}</h1>
            <p className="text-sm text-text-secondary">{description}</p>
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      </header>
      {children}
    </div>
  );
}

function StaticPage({ title, description }: { title: string; description: string }) {
  return <RouteScaffold title={title} description={description} />;
}

export function SettingsMediaPage() {
  const api = useMemo(() => getApiClients(), []);
  const { pushToast } = useToast();
  const [movieRootFolder, setMovieRootFolder] = useState('');
  const [tvRootFolder, setTvRootFolder] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeBrowser, setActiveBrowser] = useState<'movie' | 'tv' | null>(null);
  const [movieFolderStatus, setMovieFolderStatus] = useState<'writable' | 'readonly' | 'notfound' | null>(null);
  const [tvFolderStatus, setTvFolderStatus] = useState<'writable' | 'readonly' | 'notfound' | null>(null);

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
      try {
        const settings = await api.mediaManagementApi.get();
        setMovieRootFolder(settings.movieRootFolder);
        setTvRootFolder(settings.tvRootFolder);
      } finally {
        setIsLoaded(true);
      }
    };

    void load();
  }, [api]);

  const onSave = async () => {
    setIsSaving(true);
    try {
      const updated = await api.mediaManagementApi.save({ movieRootFolder, tvRootFolder });
      setMovieRootFolder(updated.movieRootFolder);
      setTvRootFolder(updated.tvRootFolder);
      pushToast({ title: 'Media settings saved.', variant: 'success' });
    } catch {
      pushToast({ title: 'Failed to save media settings.', variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <RouteScaffold
      title="Media Management"
      description="Root folder settings for movies and TV series."
    >
      {isLoaded && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="text-sm text-text-secondary">
            <label>
              Movie Root Folder
              <p className="text-xs text-text-secondary">Default destination folder for new movies.</p>
              <div className="mt-1 flex items-center gap-1">
                <input
                  type="text"
                  value={movieRootFolder}
                  onChange={event => { setMovieRootFolder(event.target.value); setMovieFolderStatus(null); }}
                  className="min-w-0 flex-1 rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
                />
                <button
                  type="button"
                  aria-label="Browse movie root folder"
                  onClick={() => setActiveBrowser('movie')}
                  className="flex-shrink-0 rounded-sm border border-border-subtle bg-surface-1 p-1 hover:bg-surface-2"
                >
                  <Folder size={16} />
                </button>
                <button
                  type="button"
                  aria-label="Validate movie root folder"
                  onClick={() => { void validateDirectory(movieRootFolder, setMovieFolderStatus); }}
                  className="flex-shrink-0 rounded-sm border border-border-subtle bg-surface-1 px-2 py-1 text-xs hover:bg-surface-2"
                >
                  Validate
                </button>
              </div>
            </label>
            {movieFolderStatus === 'writable' && <span className="mt-1 block text-xs text-green-500">✓ Writable</span>}
            {movieFolderStatus === 'readonly' && <span className="mt-1 block text-xs text-yellow-500">⚠ Read-only</span>}
            {movieFolderStatus === 'notfound' && <span className="mt-1 block text-xs text-red-500">✗ Not found</span>}
          </div>

          <div className="text-sm text-text-secondary">
            <label>
              TV Root Folder
              <p className="text-xs text-text-secondary">Default destination folder for new TV series.</p>
              <div className="mt-1 flex items-center gap-1">
                <input
                  type="text"
                  value={tvRootFolder}
                  onChange={event => { setTvRootFolder(event.target.value); setTvFolderStatus(null); }}
                  className="min-w-0 flex-1 rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
                />
                <button
                  type="button"
                  aria-label="Browse TV root folder"
                  onClick={() => setActiveBrowser('tv')}
                  className="flex-shrink-0 rounded-sm border border-border-subtle bg-surface-1 p-1 hover:bg-surface-2"
                >
                  <Folder size={16} />
                </button>
                <button
                  type="button"
                  aria-label="Validate TV root folder"
                  onClick={() => { void validateDirectory(tvRootFolder, setTvFolderStatus); }}
                  className="flex-shrink-0 rounded-sm border border-border-subtle bg-surface-1 px-2 py-1 text-xs hover:bg-surface-2"
                >
                  Validate
                </button>
              </div>
            </label>
            {tvFolderStatus === 'writable' && <span className="mt-1 block text-xs text-green-500">✓ Writable</span>}
            {tvFolderStatus === 'readonly' && <span className="mt-1 block text-xs text-yellow-500">⚠ Read-only</span>}
            {tvFolderStatus === 'notfound' && <span className="mt-1 block text-xs text-red-500">✗ Not found</span>}
          </div>
        </div>
      )}

      <div className="mt-4">
        <button
          type="button"
          onClick={() => { void onSave(); }}
          disabled={!isLoaded || isSaving}
          className="rounded-sm border border-border-subtle bg-surface-2 px-3 py-2 text-sm"
        >
          {isSaving ? 'Saving...' : 'Save Media Settings'}
        </button>
      </div>

      <FilesystemBrowser
        isOpen={activeBrowser !== null}
        onClose={() => setActiveBrowser(null)}
        onSelect={(path) => {
          if (activeBrowser === 'movie') {
            setMovieRootFolder(path);
            setMovieFolderStatus(null);
          } else if (activeBrowser === 'tv') {
            setTvRootFolder(path);
            setTvFolderStatus(null);
          }
          setActiveBrowser(null);
        }}
        initialPath={activeBrowser === 'movie' ? movieRootFolder : tvRootFolder}
      />
    </RouteScaffold>
  );
}

function SettingsIndexersPage() {
  const api = useMemo(() => getApiClients(), []);
  const { pushToast } = useToast();
  const [indexers, setIndexers] = useState<IndexerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<IndexerItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const onAdd = async (draft: any) => {
    setIsSubmitting(true);
    try {
      await api.indexerApi.create({
        ...draft,
        settings: JSON.stringify(draft.settings),
      });
      setIsAddModalOpen(false);
      pushToast({ title: 'Indexer created', variant: 'success' });
      await load();
    } catch (err) {
      pushToast({
        title: 'Save failed',
        message: err instanceof Error ? err.message : 'Failed to create indexer',
        variant: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onEdit = async (draft: any) => {
    setIsSubmitting(true);
    try {
      await api.indexerApi.update(draft.id, {
        ...draft,
        settings: JSON.stringify(draft.settings),
      });
      setEditing(null);
      pushToast({ title: 'Indexer updated', variant: 'success' });
      await load();
    } catch (err) {
      pushToast({
        title: 'Save failed',
        message: err instanceof Error ? err.message : 'Failed to update indexer',
        variant: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this indexer?')) {
      return;
    }
    try {
      await api.indexerApi.remove(id);
      pushToast({ title: 'Indexer deleted', variant: 'success' });
      await load();
    } catch (err) {
      pushToast({
        title: 'Delete failed',
        message: err instanceof Error ? err.message : 'Failed to delete indexer',
        variant: 'error',
      });
    }
  };

  const onToggle = async (id: number, enabled: boolean) => {
    try {
      await api.indexerApi.update(id, { enabled });
      await load();
    } catch (err) {
      pushToast({
        title: 'Toggle failed',
        message: err instanceof Error ? err.message : 'Failed to toggle indexer',
        variant: 'error',
      });
    }
  };

  const addIndexerPresets = useMemo(() => [
    ...getPopularPresets(),
    {
      id: 'torznab-generic',
      name: 'Generic Torznab',
      description: 'Custom torrent tracker using Torznab contract.',
      protocol: 'torrent',
      implementation: 'Torznab',
      configContract: 'TorznabSettings',
      privacy: 'Public',
      fields: [
        { name: 'url', label: 'Indexer URL', type: 'text', required: true },
        { name: 'apiKey', label: 'API Key', type: 'password', required: true },
      ],
    },
  ], []);

  return (
    <RouteScaffold
      title="Indexers"
      description="Single global indexer list used by both movie and TV search via the monolith search aggregation service."
    >
      <div className="flex gap-2">
        <button
          type="button"
          className="rounded-sm border border-border-subtle bg-surface-2 px-3 py-1.5 text-sm font-medium"
          onClick={() => setIsAddModalOpen(true)}
        >
          Add Indexer
        </button>
        <button
          type="button"
          className="rounded-sm border border-border-subtle bg-surface-1 px-3 py-1.5 text-sm"
          onClick={() => { void load(); }}
        >
          Refresh
        </button>
      </div>

      {error ? <p className="text-sm text-status-error">{error}</p> : null}
      {isLoading ? <p className="text-sm text-text-secondary">Loading indexers...</p> : null}

      <ul className="space-y-3">
        {indexers.map(indexer => (
          <li key={indexer.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border-subtle bg-surface-1 p-4 shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{indexer.name}</p>
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] uppercase tracking-wider text-text-secondary">
                  {indexer.protocol}
                </span>
              </div>
              <p className="text-xs text-text-secondary">{indexer.implementation} / {indexer.configContract}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-sm border border-border-subtle px-2.5 py-1 text-xs font-medium hover:bg-surface-2"
                onClick={() => onToggle(indexer.id, !indexer.enabled)}
              >
                {indexer.enabled ? 'Disable' : 'Enable'}
              </button>
              <button
                type="button"
                className="rounded-sm border border-border-subtle px-2.5 py-1 text-xs font-medium hover:bg-surface-2"
                onClick={() => setEditing(indexer)}
              >
                Edit
              </button>
              <button
                type="button"
                className="rounded-sm border border-border-subtle px-2.5 py-1 text-xs font-medium hover:bg-surface-2"
                onClick={() => {
                  void api.indexerApi.test(indexer.id).then(res => {
                    pushToast({
                      title: res.success ? 'Indexer test passed' : 'Indexer test failed',
                      message: res.message,
                      variant: res.success ? 'success' : 'error',
                    });
                  });
                }}
              >
                Test
              </button>
              <button
                type="button"
                className="rounded-sm border border-status-error/20 px-2.5 py-1 text-xs font-medium text-status-error hover:bg-status-error/10"
                onClick={() => onDelete(indexer.id)}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
        {!isLoading && indexers.length === 0 && (
          <li className="rounded-md border border-dashed border-border-subtle p-8 text-center text-sm text-text-secondary">
            No indexers configured yet. Click "Add Indexer" to get started.
          </li>
        )}
      </ul>

      <AddIndexerModal
        isOpen={isAddModalOpen}
        presets={addIndexerPresets as any}
        isSubmitting={isSubmitting}
        onClose={() => setIsAddModalOpen(false)}
        onCreate={onAdd}
        onTestConnection={async (draft) => {
          const res = await api.indexerApi.testDraft({
            ...draft,
            settings: JSON.stringify(draft.settings),
          } as any);
          return {
            success: res.success,
            message: res.message,
            hints: res.diagnostics?.remediationHints ?? [],
          };
        }}
      />

      {editing ? (
        <EditIndexerModal
          key={editing.id}
          isOpen
          indexer={editing as any}
          isSubmitting={isSubmitting}
          onClose={() => setEditing(null)}
          onSave={onEdit}
        />
      ) : null}
    </RouteScaffold>
  );
}

export function SettingsClientsPage() {
  const api = useMemo(() => getApiClients(), []);
  const { pushToast } = useToast();
  const [settings, setSettings] = useState<TorrentLimitsSettings | null>(null);
  const [incompleteDirectory, setIncompleteDirectory] = useState('');
  const [completeDirectory, setCompleteDirectory] = useState('');
  const [globalDownloadLimitKbps, setGlobalDownloadLimitKbps] = useState('0');
  const [globalUploadLimitKbps, setGlobalUploadLimitKbps] = useState('0');
  const [maxActiveDownloads, setMaxActiveDownloads] = useState('3');
  const [seedRatioLimit, setSeedRatioLimit] = useState('0');
  const [seedTimeLimitMinutes, setSeedTimeLimitMinutes] = useState('0');
  const [seedLimitAction, setSeedLimitAction] = useState<'pause' | 'remove'>('pause');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeBrowser, setActiveBrowser] = useState<'incomplete' | 'complete' | null>(null);
  const [incompleteStatus, setIncompleteStatus] = useState<'writable' | 'readonly' | 'notfound' | null>(null);
  const [completeStatus, setCompleteStatus] = useState<'writable' | 'readonly' | 'notfound' | null>(null);

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
        setSettings(value);
        setIncompleteDirectory(value.incompleteDirectory);
        setCompleteDirectory(value.completeDirectory);
        setGlobalDownloadLimitKbps(String(value.globalDownloadLimitKbps ?? 0));
        setGlobalUploadLimitKbps(String(value.globalUploadLimitKbps ?? 0));
        setMaxActiveDownloads(String(value.maxActiveDownloads));
        setSeedRatioLimit(String(value.seedRatioLimit));
        setSeedTimeLimitMinutes(String(value.seedTimeLimitMinutes));
        setSeedLimitAction(value.seedLimitAction);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load download client settings');
      }
    };

    void load();
  }, [api]);

  const onSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setIsSaving(true);
    setError(null);
    try {
      const dlLimit = Number.parseFloat(globalDownloadLimitKbps);
      const ulLimit = Number.parseFloat(globalUploadLimitKbps);
      const updated = await api.downloadClientApi.save({
        maxActiveDownloads: Number.parseInt(maxActiveDownloads, 10),
        maxActiveSeeds: settings?.maxActiveSeeds ?? 3,
        globalDownloadLimitKbps: dlLimit > 0 ? dlLimit : null,
        globalUploadLimitKbps: ulLimit > 0 ? ulLimit : null,
        incompleteDirectory,
        completeDirectory,
        seedRatioLimit: Number.parseFloat(seedRatioLimit),
        seedTimeLimitMinutes: Number.parseInt(seedTimeLimitMinutes, 10),
        seedLimitAction,
      });
      setSettings(updated);
      setIncompleteDirectory(updated.incompleteDirectory);
      setCompleteDirectory(updated.completeDirectory);
      setGlobalDownloadLimitKbps(String(updated.globalDownloadLimitKbps ?? 0));
      setGlobalUploadLimitKbps(String(updated.globalUploadLimitKbps ?? 0));
      setMaxActiveDownloads(String(updated.maxActiveDownloads));
      setSeedRatioLimit(String(updated.seedRatioLimit));
      setSeedTimeLimitMinutes(String(updated.seedTimeLimitMinutes));
      setSeedLimitAction(updated.seedLimitAction);
      pushToast({ title: 'Download Client settings saved.', variant: 'success' });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save download client settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <RouteScaffold title="Download Client" description="Integrated downloader settings for the built-in torrent client.">
      {error ? <p className="text-sm text-status-error">{error}</p> : null}
      <form
        className="rounded-md border border-border-subtle bg-surface-1 p-4 text-sm text-text-secondary"
        onSubmit={event => { void onSave(event); }}
      >
        {!settings ? (
          <p>Loading settings...</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="text-sm text-text-secondary">
              <label>
                Incomplete Directory
                <p className="text-xs text-text-secondary">Where downloading pieces are stored temporarily.</p>
                <div className="mt-1 flex items-center gap-1">
                  <input
                    type="text"
                    value={incompleteDirectory}
                    onChange={event => { setIncompleteDirectory(event.target.value); setIncompleteStatus(null); }}
                    className="min-w-0 flex-1 rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
                  />
                  <button
                    type="button"
                    aria-label="Browse incomplete directory"
                    onClick={() => setActiveBrowser('incomplete')}
                    className="flex-shrink-0 rounded-sm border border-border-subtle bg-surface-1 p-1 hover:bg-surface-2"
                  >
                    <Folder size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label="Validate incomplete directory"
                    onClick={() => { void validateDirectory(incompleteDirectory, setIncompleteStatus); }}
                    className="flex-shrink-0 rounded-sm border border-border-subtle bg-surface-1 px-2 py-1 text-xs hover:bg-surface-2"
                  >
                    Validate
                  </button>
                </div>
              </label>
              {incompleteStatus === 'writable' && (
                <span className="mt-1 block text-xs text-green-500">✓ Writable</span>
              )}
              {incompleteStatus === 'readonly' && (
                <span className="mt-1 block text-xs text-yellow-500">⚠ Read-only</span>
              )}
              {incompleteStatus === 'notfound' && (
                <span className="mt-1 block text-xs text-red-500">✗ Not found</span>
              )}
            </div>
            <div className="text-sm text-text-secondary">
              <label>
                Complete Directory
                <p className="text-xs text-text-secondary">Where finished torrents are moved after download.</p>
                <div className="mt-1 flex items-center gap-1">
                  <input
                    type="text"
                    value={completeDirectory}
                    onChange={event => { setCompleteDirectory(event.target.value); setCompleteStatus(null); }}
                    className="min-w-0 flex-1 rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
                  />
                  <button
                    type="button"
                    aria-label="Browse complete directory"
                    onClick={() => setActiveBrowser('complete')}
                    className="flex-shrink-0 rounded-sm border border-border-subtle bg-surface-1 p-1 hover:bg-surface-2"
                  >
                    <Folder size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label="Validate complete directory"
                    onClick={() => { void validateDirectory(completeDirectory, setCompleteStatus); }}
                    className="flex-shrink-0 rounded-sm border border-border-subtle bg-surface-1 px-2 py-1 text-xs hover:bg-surface-2"
                  >
                    Validate
                  </button>
                </div>
              </label>
              {completeStatus === 'writable' && (
                <span className="mt-1 block text-xs text-green-500">✓ Writable</span>
              )}
              {completeStatus === 'readonly' && (
                <span className="mt-1 block text-xs text-yellow-500">⚠ Read-only</span>
              )}
              {completeStatus === 'notfound' && (
                <span className="mt-1 block text-xs text-red-500">✗ Not found</span>
              )}
            </div>
            <label className="text-sm text-text-secondary">
              Max Download Speed (KB/s, 0 = unlimited)
              <input
                type="number"
                min={0}
                step={1}
                value={globalDownloadLimitKbps}
                onChange={event => setGlobalDownloadLimitKbps(event.target.value)}
                className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
              />
            </label>
            <label className="text-sm text-text-secondary">
              Max Upload Speed (KB/s, 0 = unlimited)
              <input
                type="number"
                min={0}
                step={1}
                value={globalUploadLimitKbps}
                onChange={event => setGlobalUploadLimitKbps(event.target.value)}
                className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
              />
            </label>
            <label className="text-sm text-text-secondary">
              Max Active Downloads (0 = unlimited)
              <input
                type="number"
                min={0}
                step={1}
                value={maxActiveDownloads}
                onChange={event => setMaxActiveDownloads(event.target.value)}
                className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
              />
            </label>
            <label className="text-sm text-text-secondary">
              Seed Ratio Limit (0 = unlimited)
              <input
                type="number"
                min={0}
                step={0.01}
                value={seedRatioLimit}
                onChange={event => setSeedRatioLimit(event.target.value)}
                className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
              />
            </label>
            <label className="text-sm text-text-secondary">
              Seed Time Limit (minutes, 0 = unlimited)
              <input
                type="number"
                min={0}
                step={1}
                value={seedTimeLimitMinutes}
                onChange={event => setSeedTimeLimitMinutes(event.target.value)}
                className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
              />
            </label>
            <label className="text-sm text-text-secondary">
              When Seed Limit Reached
              <select
                value={seedLimitAction}
                onChange={event => setSeedLimitAction(event.target.value as 'pause' | 'remove')}
                className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
              >
                <option value="pause">Pause torrent</option>
                <option value="remove">Remove torrent</option>
              </select>
            </label>
          </div>
        )}
        <div className="mt-4">
          <button
            type="submit"
            className="rounded-sm border border-border-subtle bg-surface-2 px-3 py-2 text-sm"
            disabled={!settings || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Download Client Settings'}
          </button>
        </div>
      </form>
      <FilesystemBrowser
        isOpen={activeBrowser !== null}
        onClose={() => setActiveBrowser(null)}
        onSelect={(path) => {
          if (activeBrowser === 'incomplete') {
            setIncompleteDirectory(path);
            setIncompleteStatus(null);
          } else if (activeBrowser === 'complete') {
            setCompleteDirectory(path);
            setCompleteStatus(null);
          }
          setActiveBrowser(null);
        }}
        initialPath={activeBrowser === 'incomplete' ? incompleteDirectory : completeDirectory}
      />
    </RouteScaffold>
  );
}

export function SettingsProfilesPage() {
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
  const [editingProfile, setEditingProfile] = useState<QualityProfileItem | null>(null);
  const [isEditModalSaving, setIsEditModalSaving] = useState(false);

  const handleSaveEditProfile = async (input: CreateQualityProfileInput) => {
    if (!editingProfile) return;
    setIsEditModalSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.qualityProfileApi.update(editingProfile.id, input);
      await load();
      setMessage(`Updated profile "${input.name}".`);
      setEditingProfile(null);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update quality profile');
    } finally {
      setIsEditModalSaving(false);
    }
  };

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
                    className="rounded-sm border border-border-subtle px-2 py-1 text-xs"
                    onClick={() => setEditingProfile(profile)}
                    disabled={isSaving}
                  >
                    Edit
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
      {editingProfile ? (
        <AddProfileModal
          isOpen
          onClose={() => setEditingProfile(null)}
          onSave={handleSaveEditProfile}
          editProfile={editingProfile}
          isLoading={isEditModalSaving}
        />
      ) : null}
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

function getPosterUrl(images?: Array<{ coverType: string; url: string }>): string | undefined {
  if (!images?.length) return undefined;
  return (
    images.find(img => img.coverType.toLowerCase() === 'poster')?.url ??
    images[0].url
  );
}

function SearchPage() {
  const api = useMemo(() => getApiClients(), []);
  const { pushToast } = useToast();
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<MetadataSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | 'TV' | 'MOVIE'>('all');

  const onSearch = async (event: FormEvent) => {
    event.preventDefault();
    if (!term.trim()) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setTypeFilter('all');
    try {
      const data = await api.mediaApi.searchMetadata({ term });
      setResults(data);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : 'Search failed');
    } finally {
      setIsLoading(false);
    }
  };

  const onAdd = async (item: MetadataSearchResult) => {
    try {
      await api.mediaApi.addToWanted({
        mediaType: item.mediaType,
        tmdbId: item.tmdbId,
        tvdbId: item.tvdbId,
        title: item.title,
        year: item.year,
        status: item.status,
        overview: item.overview,
        network: item.network,
        posterUrl: getPosterUrl(item.images),
      });
      pushToast({
        title: 'Added to Wanted',
        message: `"${item.title}" has been added to your collection.`,
        variant: 'success',
      });
    } catch (addError) {
      pushToast({
        title: 'Failed to add',
        message: addError instanceof Error ? addError.message : 'Failed to add item',
        variant: 'error',
      });
    }
  };

  return (
    <RouteScaffold title="Search" description="Search for movies and TV shows to add to your collection.">
      <form onSubmit={event => { void onSearch(event); }} className="flex gap-2">
        <input
          value={term}
          onChange={event => setTerm(event.target.value)}
          placeholder="Search by title..."
          className="flex-1 rounded-sm border border-border-subtle bg-surface-1 px-3 py-2 text-sm"
          autoFocus
        />
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-sm border border-border-subtle bg-surface-2 px-4 py-2 text-sm font-medium"
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error ? <p className="text-sm text-status-error">{error}</p> : null}

      {results.length > 0 && (
        <div className="flex items-center gap-1">
          {(['all', 'TV', 'MOVIE'] as const).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setTypeFilter(f)}
              className={`rounded-sm px-3 py-1 text-xs font-medium border ${typeFilter === f ? 'bg-surface-3 border-border-subtle text-text-primary' : 'bg-surface-1 border-transparent text-text-secondary hover:text-text-primary'}`}
            >
              {f === 'all' ? `All (${results.length})` : f === 'TV' ? `TV (${results.filter(r => r.mediaType === 'TV').length})` : `Movies (${results.filter(r => r.mediaType === 'MOVIE').length})`}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {results.filter(r => typeFilter === 'all' || r.mediaType === typeFilter).map((item, index) => (
          <div key={`${item.mediaType}-${item.tmdbId || item.tvdbId || index}`} className="flex flex-col overflow-hidden rounded-md border border-border-subtle bg-surface-1">
            <div className="aspect-[2/3] w-full bg-surface-2">
              {getPosterUrl(item.images) ? (
                <img src={getPosterUrl(item.images)} alt={item.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-text-secondary">No Poster</div>
              )}
            </div>
            <div className="flex flex-1 flex-col p-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="line-clamp-1 font-medium">{item.title}</h3>
                <span className="shrink-0 rounded-sm bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                  {item.mediaType}
                </span>
              </div>
              <p className="text-xs text-text-secondary">{item.year || 'Unknown Year'}</p>
              <p className="mt-2 line-clamp-3 flex-1 text-xs text-text-secondary">{item.overview}</p>
              <button
                type="button"
                onClick={() => { void onAdd(item); }}
                className="mt-3 w-full rounded-sm border border-border-subtle bg-surface-2 py-1.5 text-xs font-medium"
              >
                Add to Wanted
              </button>
            </div>
          </div>
        ))}
      </div>
    </RouteScaffold>
  );
}

function MoviesLibraryPage() {
  const api = useMemo(() => getApiClients(), []);
  const [movies, setMovies] = useState<MovieViewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchMovieId, setSearchMovieId] = useState<number | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [sortBy, setSortBy] = useState('title');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const page = await api.mediaApi.listMovies({ page: 1, pageSize: 10_000 });
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

  const sortedMovies = useMemo(() => {
    const sign = sortDir === 'desc' ? -1 : 1;
    const field = sortBy === 'title' ? 'sortTitle' : sortBy;
    return [...movies].sort((a, b) => {
      const aVal = (a as any)[field] ?? (sortBy === 'title' ? a.title : 0);
      const bVal = (b as any)[field] ?? (sortBy === 'title' ? b.title : 0);
      if (typeof aVal === 'number' && typeof bVal === 'number') return (aVal - bVal) * sign;
      return String(aVal ?? '').localeCompare(String(bVal ?? '')) * sign;
    });
  }, [movies, sortBy, sortDir]);

  const selectedMovie = movies.find(movie => movie.id === searchMovieId) ?? null;

  return (
    <RouteScaffold
      title="Movies"
      description="Unified movie library view with interactive search and grab actions."
      actions={
        <button
          type="button"
          onClick={() => setIsImportOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-sm border border-border-subtle bg-surface-2 px-3 py-1.5 text-sm font-medium hover:bg-surface-3"
        >
          <Folder size={14} />
          Import Existing
        </button>
      }
    >
      {error ? <p className="text-sm text-status-error">{error}</p> : null}
      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <span>Sort:</span>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
        >
          <option value="title">Name</option>
          <option value="year">Year</option>
          <option value="sizeOnDisk">Size</option>
          <option value="status">Status</option>
        </select>
        <button
          type="button"
          onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
          className="rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary hover:bg-surface-2"
          aria-label={sortDir === 'asc' ? 'Sort ascending' : 'Sort descending'}
        >
          {sortDir === 'asc' ? '↑ Asc' : '↓ Desc'}
        </button>
      </div>
      <MovieOverviewView
        items={sortedMovies}
        isLoading={isLoading}
        onToggleMonitored={(id, monitored) => {
          void api.mediaApi.setMovieMonitored(id, monitored).then(load);
        }}
        onDelete={async id => {
          const deleteFiles = window.confirm('Also delete files from disk? This cannot be undone.');
          await api.mediaApi.deleteMovie(id, deleteFiles);
          await load();
        }}
        onSearch={id => setSearchMovieId(id)}
      />
      {selectedMovie ? (
        <MovieInteractiveSearchModal
          isOpen
          onClose={() => setSearchMovieId(null)}
          movieId={selectedMovie.id}
          movieTitle={selectedMovie.title}
          movieYear={selectedMovie.year ?? undefined}
          imdbId={selectedMovie.imdbId ?? undefined}
          tmdbId={selectedMovie.tmdbId ?? undefined}
        />
      ) : null}
      <ImportWizard
        isOpen={isImportOpen}
        onClose={() => { setIsImportOpen(false); void load(); }}
        mediaType="movie"
      />
    </RouteScaffold>
  );
}

function MovieDetailPage() {
  const api = useMemo(() => getApiClients(), []);
  const params = useParams();
  const navigate = useNavigate();
  const { pushToast } = useToast();
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
    posterUrl?: string;
    genres?: string[];
    qualityProfileId?: number;
    path?: string;
    sizeOnDisk?: number;
  } | null>(null);
  const [qualityProfiles, setQualityProfiles] = useState<QualityProfileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

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
        const [item, profiles] = await Promise.all([
          api.movieApi.getById(movieId),
          api.qualityProfileApi.list(),
        ]);
        setMovie({
          id: item.id,
          title: item.title,
          year: item.year ?? undefined,
          overview: item.overview ?? undefined,
          status: item.status ?? undefined,
          monitored: item.monitored ?? false,
          tmdbId: item.tmdbId ?? undefined,
          imdbId: item.imdbId ?? undefined,
          posterUrl: item.posterUrl ?? undefined,
          genres: (item as any).genres as string[] | undefined,
          qualityProfileId: item.qualityProfileId,
          path: (item as any).path ?? undefined,
          sizeOnDisk: item.sizeOnDisk ?? undefined,
        });
        setQualityProfiles(profiles);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load movie details');
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [api, movieId]);

  const handleToggleMonitored = async () => {
    if (!movie) return;
    try {
      await api.mediaApi.setMovieMonitored(movie.id, !movie.monitored);
      setMovie(prev => prev ? { ...prev, monitored: !prev.monitored } : prev);
    } catch (err) {
      pushToast({ title: 'Error', variant: 'error', message: 'Failed to update monitoring' });
    }
  };

  const handleQualityProfileChange = async (profileId: number) => {
    if (!movie) return;
    try {
      await api.movieApi.update(movie.id, { qualityProfileId: profileId });
      setMovie(prev => prev ? { ...prev, qualityProfileId: profileId } : prev);
    } catch (err) {
      pushToast({ title: 'Error', variant: 'error', message: 'Failed to update quality profile' });
    }
  };

  const handleRemove = async () => {
    if (!movie) return;
    if (!window.confirm(`Remove "${movie.title}" from library?`)) return;
    const deleteFiles = window.confirm('Also delete files from disk? This cannot be undone.');
    try {
      await api.mediaApi.deleteMovie(movie.id, deleteFiles);
      const msg = deleteFiles ? `"${movie.title}" removed from library and deleted from disk` : `"${movie.title}" removed from library`;
      pushToast({ title: 'Success', variant: 'success', message: msg });
      navigate('/library/movies');
    } catch (err) {
      pushToast({ title: 'Error', variant: 'error', message: 'Failed to remove movie' });
    }
  };

  return (
    <RouteScaffold title="Movie Details" description="Details and interactive search for the selected movie.">
      {isLoading ? <p className="text-sm text-text-secondary">Loading movie...</p> : null}
      {error ? <p className="text-sm text-status-error">{error}</p> : null}
      {movie ? (
        <>
          {/* Header: poster + metadata */}
          <section className="flex gap-6 rounded-md border border-border-subtle bg-surface-1 p-4">
            <div className="flex-shrink-0 w-32">
              {movie.posterUrl ? (
                <img src={movie.posterUrl} alt={movie.title} className="w-full rounded-md object-cover" />
              ) : (
                <div className="flex h-48 w-32 items-center justify-center rounded-md bg-surface-2 text-xs text-text-secondary">No Poster</div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <h2 className="text-xl font-semibold">{movie.title}</h2>
              <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
                {movie.year ? <span>{movie.year}</span> : null}
                {movie.status ? <span className="rounded-sm bg-surface-2 px-2 py-0.5 text-xs">{movie.status}</span> : null}
              </div>
              {movie.genres && movie.genres.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {movie.genres.map(g => (
                    <span key={g} className="rounded-sm bg-surface-2 px-2 py-0.5 text-xs text-text-secondary">{g}</span>
                  ))}
                </div>
              ) : null}
              {movie.overview ? <p className="text-sm text-text-secondary">{movie.overview}</p> : null}
              {movie.path ? (
                <p className="text-xs text-text-secondary font-mono truncate" title={movie.path}>{movie.path}</p>
              ) : null}
              {movie.sizeOnDisk != null && movie.sizeOnDisk > 0 ? (
                <p className="text-xs text-text-muted">{formatBytes(movie.sizeOnDisk)} on disk</p>
              ) : null}
            </div>
          </section>

          {/* Controls */}
          <section className="flex flex-wrap items-center gap-4 rounded-md border border-border-subtle bg-surface-1 p-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={movie.monitored}
                aria-label="Monitored"
                onChange={() => { void handleToggleMonitored(); }}
              />
              Monitored
            </label>

            <label className="flex items-center gap-2 text-sm" htmlFor="movie-quality-profile">
              Quality Profile
              <select
                id="movie-quality-profile"
                aria-label="Quality Profile"
                value={movie.qualityProfileId ?? ''}
                onChange={event => { void handleQualityProfileChange(Number(event.target.value)); }}
                className="rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm"
              >
                {qualityProfiles.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className="rounded-sm border border-border-subtle bg-surface-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-3 flex items-center gap-2"
              onClick={() => setIsSearchModalOpen(true)}
            >
              <Search size={16} />
              Interactive Search
            </button>

            <button
              type="button"
              className="rounded-sm border border-status-error/60 px-3 py-2 text-sm text-status-error"
              aria-label="Remove from Library"
              onClick={() => { void handleRemove(); }}
            >
              Remove from Library
            </button>
          </section>

          <MovieInteractiveSearchModal
            isOpen={isSearchModalOpen}
            onClose={() => setIsSearchModalOpen(false)}
            movieId={movie.id}
            movieTitle={movie.title}
            movieYear={movie.year}
            imdbId={movie.imdbId}
            tmdbId={movie.tmdbId}
          />
        </>
      ) : null}
    </RouteScaffold>
  );
}

function SeriesLibraryPage() {
  const api = useMemo(() => getApiClients(), []);
  const [series, setSeries] = useState<SeriesViewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [sortBy, setSortBy] = useState('title');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const page = await api.mediaApi.listSeries({ page: 1, pageSize: 10_000 });
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

  const sortedSeries = useMemo(() => {
    const sign = sortDir === 'desc' ? -1 : 1;
    const field = sortBy === 'title' ? 'sortTitle' : sortBy;
    return [...series].sort((a, b) => {
      const aVal = (a as any)[field] ?? (sortBy === 'title' ? a.title : 0);
      const bVal = (b as any)[field] ?? (sortBy === 'title' ? b.title : 0);
      if (typeof aVal === 'number' && typeof bVal === 'number') return (aVal - bVal) * sign;
      return String(aVal ?? '').localeCompare(String(bVal ?? '')) * sign;
    });
  }, [series, sortBy, sortDir]);

  return (
    <RouteScaffold
      title="TV Shows"
      description="Unified TV library view with monitoring controls and details access."
      actions={
        <button
          type="button"
          onClick={() => setIsImportOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-sm border border-border-subtle bg-surface-2 px-3 py-1.5 text-sm font-medium hover:bg-surface-3"
        >
          <Folder size={14} />
          Import Existing
        </button>
      }
    >
      {error ? <p className="text-sm text-status-error">{error}</p> : null}
      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <span>Sort:</span>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
        >
          <option value="title">Name</option>
          <option value="year">Year</option>
          <option value="sizeOnDisk">Size</option>
          <option value="status">Status</option>
        </select>
        <button
          type="button"
          onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
          className="rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary hover:bg-surface-2"
          aria-label={sortDir === 'asc' ? 'Sort ascending' : 'Sort descending'}
        >
          {sortDir === 'asc' ? '↑ Asc' : '↓ Desc'}
        </button>
      </div>
      <SeriesOverviewView
        items={sortedSeries}
        onToggleMonitored={(id, monitored) => {
          void api.mediaApi.setSeriesMonitored(id, monitored).then(load);
        }}
        onDelete={async id => {
          const deleteFiles = window.confirm('Also delete files from disk? This cannot be undone.');
          await api.mediaApi.deleteSeries(id, deleteFiles);
          await load();
        }}
        onRefresh={() => {
          void load();
        }}
      />
      {isLoading ? <p className="text-sm text-text-secondary">Loading series...</p> : null}
      <ImportWizard
        isOpen={isImportOpen}
        onClose={() => { setIsImportOpen(false); void load(); }}
        mediaType="series"
      />
    </RouteScaffold>
  );
}

type EpisodeItem = {
  id: number;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  airDateUtc?: string | null;
  monitored: boolean;
  hasFile?: boolean;
  isDownloading?: boolean;
};

type SeasonItem = {
  id: number;
  seasonNumber: number;
  monitored: boolean;
  episodes: EpisodeItem[];
  statistics?: {
    totalEpisodes: number;
    episodesOnDisk: number;
    episodesMissing: number;
    episodesDownloading: number;
  };
};

type SeriesDetail = {
  id: number;
  title: string;
  year?: number;
  status?: string;
  overview?: string;
  network?: string;
  posterUrl?: string;
  tvdbId?: number;
  monitored: boolean;
  qualityProfileId?: number;
  path?: string;
  sizeOnDisk?: number;
  seasons: SeasonItem[];
  statistics?: {
    totalEpisodes: number;
    episodesOnDisk: number;
    episodesMissing: number;
    episodesDownloading: number;
  };
};

function SeriesDetailPage() {
  const api = useMemo(() => getApiClients(), []);
  const params = useParams();
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const seriesId = Number(params.id);
  const [series, setSeries] = useState<SeriesDetail | null>(null);
  const [qualityProfiles, setQualityProfiles] = useState<QualityProfileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSeasons, setExpandedSeasons] = useState<Set<number>>(new Set());
  const [searchModal, setSearchModal] = useState<{
    level: SearchLevel;
    season?: number;
    episode?: number;
  } | null>(null);
  const [editingPath, setEditingPath] = useState(false);
  const [pathInput, setPathInput] = useState('');

  const load = useCallback(async () => {
    if (!Number.isFinite(seriesId)) {
      setError('Invalid series id');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [item, profiles] = await Promise.all([
        api.seriesApi.getSeriesWithEpisodes(seriesId),
        api.qualityProfileApi.list(),
      ]);
      const raw = item as any;
      setSeries({
        id: item.id,
        title: item.title,
        year: raw.year,
        status: raw.status,
        overview: raw.overview,
        network: raw.network,
        posterUrl: raw.posterUrl,
        tvdbId: raw.tvdbId,
        monitored: raw.monitored ?? false,
        qualityProfileId: raw.qualityProfileId,
        path: raw.path,
        sizeOnDisk: raw.sizeOnDisk,
        statistics: raw.statistics,
        seasons: (item.seasons as any[]).map((s: any) => ({
          id: s.id,
          seasonNumber: s.seasonNumber,
          monitored: s.monitored ?? false,
          statistics: s.statistics,
          episodes: (s.episodes ?? []).map((ep: any) => ({
            id: ep.id,
            seasonNumber: ep.seasonNumber ?? s.seasonNumber,
            episodeNumber: ep.episodeNumber,
            title: ep.title ?? '',
            airDateUtc: ep.airDateUtc ?? null,
            monitored: ep.monitored ?? false,
            hasFile: ep.hasFile ?? false,
            isDownloading: ep.isDownloading ?? false,
          })),
        })),
      });
      setQualityProfiles(profiles);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load series details');
    } finally {
      setIsLoading(false);
    }
  }, [api, seriesId]);

  useEffect(() => { void load(); }, [load]);

  const handleToggleSeriesMonitored = async () => {
    if (!series) return;
    const newMonitored = !series.monitored;
    try {
      await api.mediaApi.setSeriesMonitored(series.id, newMonitored);
      setSeries(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          monitored: newMonitored,
          seasons: prev.seasons.map(s => ({ ...s, monitored: newMonitored })),
        };
      });
    } catch {
      pushToast({ title: 'Error', variant: 'error', message: 'Failed to update series monitoring' });
    }
  };

  const handleToggleSeasonMonitored = async (seasonNumber: number, currentMonitored: boolean) => {
    if (!series) return;
    try {
      await api.mediaApi.setSeasonMonitored(series.id, seasonNumber, !currentMonitored);
      setSeries(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          seasons: prev.seasons.map(s =>
            s.seasonNumber === seasonNumber ? { ...s, monitored: !currentMonitored } : s,
          ),
        };
      });
    } catch {
      pushToast({ title: 'Error', variant: 'error', message: 'Failed to update season monitoring' });
    }
  };

  const handleToggleEpisodeMonitored = async (episodeId: number, seasonNumber: number, currentMonitored: boolean) => {
    if (!series) return;
    try {
      await api.mediaApi.setEpisodeMonitored(episodeId, !currentMonitored);
      setSeries(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          seasons: prev.seasons.map(s =>
            s.seasonNumber === seasonNumber
              ? {
                ...s,
                episodes: s.episodes.map(ep =>
                  ep.id === episodeId ? { ...ep, monitored: !currentMonitored } : ep,
                ),
              }
              : s,
          ),
        };
      });
    } catch {
      pushToast({ title: 'Error', variant: 'error', message: 'Failed to update episode monitoring' });
    }
  };

  const handleQualityProfileChange = async (profileId: number) => {
    if (!series) return;
    try {
      await api.seriesApi.bulkUpdate([series.id], { qualityProfileId: profileId });
      setSeries(prev => prev ? { ...prev, qualityProfileId: profileId } : prev);
    } catch {
      pushToast({ title: 'Error', variant: 'error', message: 'Failed to update quality profile' });
    }
  };

  const handleRemove = async () => {
    if (!series) return;
    if (!window.confirm(`Remove "${series.title}" from library?`)) return;
    const deleteFiles = window.confirm('Also delete files from disk? This cannot be undone.');
    try {
      await api.mediaApi.deleteSeries(series.id, deleteFiles);
      const msg = deleteFiles ? `"${series.title}" removed from library and deleted from disk` : `"${series.title}" removed from library`;
      pushToast({ title: 'Success', variant: 'success', message: msg });
      navigate('/library/tv');
    } catch {
      pushToast({ title: 'Error', variant: 'error', message: 'Failed to remove series' });
    }
  };

  const toggleSeasonExpanded = (seasonNumber: number) => {
    setExpandedSeasons(prev => {
      const next = new Set(prev);
      if (next.has(seasonNumber)) {
        next.delete(seasonNumber);
      } else {
        next.add(seasonNumber);
      }
      return next;
    });
  };

  const firstSeason = series?.seasons[0]?.seasonNumber ?? 1;

  // Auto-expand the first season when series data loads
  useEffect(() => {
    if (series && series.seasons.length > 0) {
      setExpandedSeasons(new Set([series.seasons[0].seasonNumber]));
    }
  }, [series?.id]);

  const handleRescan = async (folderPath?: string) => {
    if (!series) return;
    try {
      const result = await api.seriesApi.rescan(series.id, folderPath);
      const parts = [`${result.episodeCount} episodes synced`];
      if (result.filesLinked > 0) parts.push(`${result.filesLinked} files linked`);
      pushToast({ title: 'Rescan complete', variant: 'success', message: parts.join(', ') });
      setEditingPath(false);
      void load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Rescan] error:', err);
      pushToast({ title: 'Rescan failed', variant: 'error', message: msg });
    }
  };

  const handleSavePathAndRescan = () => {
    void handleRescan(pathInput.trim() || undefined);
  };

  const allSeasonsMonitored = Boolean(series && series.seasons.length > 0 && series.seasons.every(s => s.monitored));
  const someSeasonsMonitored = Boolean(series && series.seasons.some(s => s.monitored));
  const seriesMonitoredIndeterminate = !allSeasonsMonitored && someSeasonsMonitored;
  const seriesMonitoredRef = (el: HTMLInputElement | null) => {
    if (el) el.indeterminate = seriesMonitoredIndeterminate;
  };

  return (
    <RouteScaffold title="Series Details" description="Details and interactive search for the selected series.">
      {isLoading ? <p className="text-sm text-text-secondary">Loading series...</p> : null}
      {error ? <p className="text-sm text-status-error">{error}</p> : null}
      {series ? (
        <>
          {/* Header: poster + metadata */}
          <section className="flex gap-6 rounded-md border border-border-subtle bg-surface-1 p-4">
            <div className="flex-shrink-0 w-32">
              {series.posterUrl ? (
                <img src={series.posterUrl} alt={series.title} className="w-full rounded-md object-cover" />
              ) : (
                <div className="flex h-48 w-32 items-center justify-center rounded-md bg-surface-2 text-xs text-text-secondary">No Poster</div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <h2 className="text-xl font-semibold">{series.title}</h2>
              <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
                {series.year ? <span>{series.year}</span> : null}
                {series.network ? <span>{series.network}</span> : null}
                {series.status ? <span className="rounded-sm bg-surface-2 px-2 py-0.5 text-xs">{series.status}</span> : null}
                {series.statistics && series.statistics.totalEpisodes > 0 ? (
                  <span className="flex items-center gap-1.5 ml-2 text-xs">
                    <span className="w-24 h-1.5 bg-surface-2 rounded-full overflow-hidden flex">
                      <span style={{ width: `${(series.statistics.episodesOnDisk / series.statistics.totalEpisodes) * 100}%` }} className="bg-status-completed h-full"></span>
                      <span style={{ width: `${(series.statistics.episodesDownloading / series.statistics.totalEpisodes) * 100}%` }} className="bg-accent-primary h-full"></span>
                      <span style={{ width: `${(series.statistics.episodesMissing / series.statistics.totalEpisodes) * 100}%` }} className="bg-status-error h-full"></span>
                    </span>
                    <span>{series.statistics.episodesOnDisk} / {series.statistics.totalEpisodes}</span>
                  </span>
                ) : null}
              </div>
              {series.overview ? <p className="text-sm text-text-secondary">{series.overview}</p> : null}
              {series.path ? (
                <p className="text-xs text-text-secondary font-mono truncate" title={series.path}>{series.path}</p>
              ) : null}
              {series.sizeOnDisk != null && series.sizeOnDisk > 0 ? (
                <p className="text-xs text-text-muted">{formatBytes(series.sizeOnDisk)} on disk</p>
              ) : null}
            </div>
          </section>

          {/* Controls */}
          <section className="flex flex-wrap items-center gap-4 rounded-md border border-border-subtle bg-surface-1 p-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                ref={seriesMonitoredRef}
                checked={series.monitored}
                aria-label="Series Monitored"
                onChange={() => { void handleToggleSeriesMonitored(); }}
              />
              Monitored
            </label>

            <label className="flex items-center gap-2 text-sm" htmlFor="series-quality-profile">
              Quality Profile
              <select
                id="series-quality-profile"
                aria-label="Quality Profile"
                value={series.qualityProfileId ?? ''}
                onChange={event => { void handleQualityProfileChange(Number(event.target.value)); }}
                className="rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm"
              >
                {qualityProfiles.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className="rounded-sm border border-accent px-3 py-2 text-sm text-accent"
              aria-label="Search"
              onClick={() => setSearchModal({ level: 'series' })}
            >
              Search
            </button>

            {editingPath ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  className="rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm font-mono w-80"
                  value={pathInput}
                  onChange={e => setPathInput(e.target.value)}
                  placeholder="Folder path on disk"
                  aria-label="Folder path"
                  onKeyDown={e => { if (e.key === 'Enter') handleSavePathAndRescan(); if (e.key === 'Escape') setEditingPath(false); }}
                  autoFocus
                />
                <button type="button" className="rounded-sm border border-accent px-3 py-1.5 text-sm text-accent" onClick={handleSavePathAndRescan}>Save & Rescan</button>
                <button type="button" className="rounded-sm border border-border-subtle px-3 py-1.5 text-sm" onClick={() => setEditingPath(false)}>Cancel</button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="rounded-sm border border-border-subtle px-3 py-2 text-sm"
                  aria-label="Rescan Episodes"
                  onClick={() => { void handleRescan(); }}
                >
                  Rescan Episodes
                </button>
                <button
                  type="button"
                  className="rounded-sm border border-border-subtle px-2 py-2 text-sm"
                  aria-label="Change folder path"
                  title="Change folder path"
                  onClick={() => { setPathInput(series.path ?? ''); setEditingPath(true); }}
                >
                  ✎
                </button>
              </div>
            )}

            <button
              type="button"
              className="rounded-sm border border-status-error/60 px-3 py-2 text-sm text-status-error"
              aria-label="Remove from Library"
              onClick={() => { void handleRemove(); }}
            >
              Remove from Library
            </button>
          </section>

          {/* Season list */}
          <section className="rounded-md border border-border-subtle bg-surface-1">
            {series.seasons.map(season => (
              <div key={season.seasonNumber} className="border-b border-border-subtle last:border-b-0">
                {/* Season row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    type="button"
                    aria-label={`Expand Season ${season.seasonNumber}`}
                    className="flex items-center gap-2 flex-1 text-left text-sm font-medium"
                    onClick={() => toggleSeasonExpanded(season.seasonNumber)}
                  >
                    <span>{expandedSeasons.has(season.seasonNumber) ? '▼' : '▶'}</span>
                    Season {season.seasonNumber}
                    <span className="text-xs text-text-secondary ml-2 flex items-center gap-3">
                      ({season.episodes.length} episodes)
                      {season.statistics && season.statistics.totalEpisodes > 0 ? (
                        <span className="w-16 h-1.5 bg-surface-2 rounded-full overflow-hidden flex">
                          <span style={{ width: `${(season.statistics.episodesOnDisk / season.statistics.totalEpisodes) * 100}%` }} className="bg-status-completed h-full"></span>
                          <span style={{ width: `${(season.statistics.episodesDownloading / season.statistics.totalEpisodes) * 100}%` }} className="bg-accent-primary h-full"></span>
                          <span style={{ width: `${(season.statistics.episodesMissing / season.statistics.totalEpisodes) * 100}%` }} className="bg-status-error h-full"></span>
                        </span>
                      ) : null}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="rounded-sm border border-border-subtle px-2 py-1 text-xs text-text-secondary"
                    aria-label={`Search Season ${season.seasonNumber}`}
                    onClick={() => setSearchModal({ level: 'season', season: season.seasonNumber })}
                  >
                    Search
                  </button>
                  <label className="flex items-center gap-1 text-xs text-text-secondary">
                    <input
                      type="checkbox"
                      checked={season.monitored ?? false}
                      aria-label={`Season ${season.seasonNumber} Monitored`}
                      onChange={() => { void handleToggleSeasonMonitored(season.seasonNumber, season.monitored ?? false); }}
                    />
                    Monitored
                  </label>
                </div>

                {/* Episode list (expanded) */}
                {expandedSeasons.has(season.seasonNumber) && (
                  <ul className="bg-surface-0 py-2">
                    {season.episodes.map(ep => (
                      <li key={ep.id} className="flex items-center gap-3 px-6 py-2 text-sm">
                        <span className="w-16 flex-shrink-0 text-xs text-text-secondary font-mono">
                          S{String(ep.seasonNumber).padStart(2, '0')}E{String(ep.episodeNumber).padStart(2, '0')}
                        </span>
                        <span className="flex-1 truncate flex items-center gap-2">
                          {ep.title}
                          {ep.isDownloading ? (
                            <span className="rounded-sm bg-accent-primary/20 px-1.5 py-0.5 text-[10px] text-accent-primary font-medium tracking-wide">Downloading</span>
                          ) : ep.hasFile ? (
                            <span className="rounded-sm bg-status-completed/20 px-1.5 py-0.5 text-[10px] text-status-completed font-medium tracking-wide">Available</span>
                          ) : ep.monitored ? (
                            <span className="rounded-sm bg-status-error/20 px-1.5 py-0.5 text-[10px] text-status-error font-medium tracking-wide">Missing</span>
                          ) : (
                            <span className="rounded-sm bg-surface-2 px-1.5 py-0.5 text-[10px] text-text-secondary font-medium tracking-wide">Unmonitored</span>
                          )}
                        </span>
                        {ep.airDateUtc ? (
                          <span className="text-xs text-text-secondary">
                            {new Date(ep.airDateUtc).toLocaleDateString()}
                          </span>
                        ) : null}
                        <button
                          type="button"
                          className="rounded-sm border border-border-subtle px-2 py-0.5 text-xs text-text-secondary flex-shrink-0"
                          aria-label={`Search S${String(ep.seasonNumber).padStart(2, '0')}E${String(ep.episodeNumber).padStart(2, '0')}`}
                          onClick={() => setSearchModal({
                            level: 'episode',
                            season: ep.seasonNumber,
                            episode: ep.episodeNumber,
                          })}
                        >
                          Search
                        </button>
                        <label className="flex items-center gap-1 text-xs text-text-secondary flex-shrink-0">
                          <input
                            type="checkbox"
                            checked={ep.monitored}
                            aria-label={`S${String(ep.seasonNumber).padStart(2, '0')}E${String(ep.episodeNumber).padStart(2, '0')} Monitored`}
                            onChange={() => { void handleToggleEpisodeMonitored(ep.id, ep.seasonNumber, ep.monitored); }}
                          />
                          Monitored
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>
        </>
      ) : null}

      {searchModal && series && (
        <SeriesInteractiveSearchModal
          isOpen
          onClose={() => setSearchModal(null)}
          seriesId={series.id}
          seriesTitle={series.title}
          initialLevel={searchModal.level}
          initialSeason={searchModal.season}
          initialEpisode={searchModal.episode}
        />
      )}
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
              <Route path="search" element={<SearchPage />} />

              <Route path="library/movies" element={<MoviesLibraryPage />} />
              <Route path="library/movies/:id" element={<MovieDetailPage />} />
              <Route path="library/tv" element={<SeriesLibraryPage />} />
              <Route path="library/tv/:id" element={<SeriesDetailPage />} />
              <Route path="library/series" element={<Navigate to="/library/tv" replace />} />
              <Route path="library/series/:id" element={<SeriesDetailPage />} />
              <Route path="library/collections" element={<StaticPage title="Collections" description="Unified collection management view." />} />

              <Route path="calendar" element={<CalendarPage />} />

              <Route path="activity/queue" element={<ActivityQueuePage />} />
              <Route path="activity/history" element={<ActivityHistoryPage />} />

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
