import { useEffect, useMemo, useState } from 'react';
import { RouteScaffold } from '@/components/primitives/RouteScaffold';
import { AddIndexerModal } from '@/components/indexers/AddIndexerModal';
import { EditIndexerModal } from '@/components/indexers/EditIndexerModal';
import { IndexerCatalogPanel } from '@/components/indexers/IndexerCatalogPanel';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { getPopularPresets } from '@/lib/indexer/indexerPresets';
import type { IndexerItem, DiscoveredService } from '@/lib/api/indexerApi';
import type { IndexerPreset, AddIndexerDraft } from '@/components/indexers/AddIndexerModal';
import type { EditIndexerSource, EditIndexerDraft } from '@/components/indexers/EditIndexerModal';

export function SettingsIndexersPage() {
  const api = useMemo(() => getApiClients(), []);
  const { pushToast } = useToast();
  const [indexers, setIndexers] = useState<IndexerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<IndexerItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddCatalogMode, setIsAddCatalogMode] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [discoveredServices, setDiscoveredServices] = useState<DiscoveredService[]>([]);
  const [isDetecting, setIsDetecting] = useState(true);
  const [isImporting, setIsImporting] = useState(false);

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
    void (async () => {
      try {
        const detected = await api.indexerApi.detect();
        setDiscoveredServices(detected);
      } catch {
        setDiscoveredServices([]);
      } finally {
        setIsDetecting(false);
      }
    })();
  }, []);

  const handleImportFrom = async (service: DiscoveredService) => {
    setIsImporting(true);
    try {
      const result = await api.indexerApi.importFrom(service.type, service.url);
      pushToast({
        title: 'Import complete',
        message: `Imported ${result.imported} indexers from ${service.name ?? service.type}`,
        variant: 'success',
      });
      setDiscoveredServices(prev => prev.filter(s => s.url !== service.url));
      await load();
    } catch (err) {
      pushToast({
        title: 'Import failed',
        message: err instanceof Error ? err.message : 'Failed to import indexers',
        variant: 'error',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const onAdd = async (draft: AddIndexerDraft) => {
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

  const onEdit = async (draft: EditIndexerDraft) => {
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

  const addIndexerPresets = useMemo<IndexerPreset[]>(() => [
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
        <div className="relative inline-block">
          <button
            type="button"
            className="rounded-sm border border-border-subtle bg-surface-2 px-3 py-1.5 text-sm font-medium"
            onClick={() => {
              setIsAddCatalogMode(true);
              setIsAddModalOpen(true);
            }}
          >
            Add Indexer
          </button>
        </div>
        <button
          type="button"
          className="rounded-sm border border-border-subtle bg-surface-1 px-3 py-1.5 text-sm"
          onClick={() => { void load(); }}
        >
          Refresh
        </button>
      </div>

      {isDetecting ? (
        <p className="text-sm text-text-secondary">Checking for LAN indexer services...</p>
      ) : discoveredServices.length > 0 ? (
        <div className="rounded-md border border-status-info/30 bg-status-info/10 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-status-info">LAN Indexer Service Detected</p>
              <div className="mt-2 space-y-2">
                {discoveredServices.map(service => (
                  <div key={service.url} className="flex items-center gap-3 text-sm">
                    <span className="text-text-secondary">
                      {service.type === 'prowlarr' ? 'Prowlarr' : 'Jackett'}
                      {service.name ? ` (${service.name})` : ''} detected at {service.url}
                      {service.indexerCount != null && ` — ${service.indexerCount} indexers`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              {discoveredServices.map(service => (
                <button
                  key={service.url}
                  type="button"
                  className="rounded-sm bg-status-info px-3 py-1.5 text-sm font-medium text-status-info-content hover:bg-status-info/80 disabled:opacity-50"
                  disabled={isImporting}
                  onClick={() => void handleImportFrom(service)}
                >
                  {isImporting ? 'Importing...' : `Import from ${service.type === 'prowlarr' ? 'Prowlarr' : 'Jackett'}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

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

      {isAddModalOpen && isAddCatalogMode ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-md border border-border-subtle bg-surface-0 p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add Indexer</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-sm border border-border-subtle bg-surface-2 px-3 py-1.5 text-sm font-medium"
                  onClick={() => setIsAddCatalogMode(false)}
                >
                  Manual
                </button>
                <button
                  type="button"
                  className="rounded-sm border border-border-subtle px-3 py-1.5 text-sm hover:bg-surface-2"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
            <IndexerCatalogPanel
              onIndexerAdded={() => {
                setIsAddModalOpen(false);
                void load();
              }}
            />
          </div>
        </div>
      ) : (
        <AddIndexerModal
          isOpen={isAddModalOpen}
          presets={addIndexerPresets}
          isSubmitting={isSubmitting}
          onClose={() => {
            setIsAddModalOpen(false);
            setIsAddCatalogMode(true);
          }}
          onCreate={onAdd}
          onTestConnection={async (draft) => {
            const res = await api.indexerApi.testDraft({
              ...draft,
              settings: JSON.stringify(draft.settings),
            });
            return {
              success: res.success,
              message: res.message,
              hints: res.diagnostics?.remediationHints ?? [],
            };
          }}
        />
      )}

      {editing ? (
        <EditIndexerModal
          key={editing.id}
          isOpen
          indexer={editing as EditIndexerSource}
          isSubmitting={isSubmitting}
          onClose={() => setEditing(null)}
          onSave={onEdit}
        />
      ) : null}
    </RouteScaffold>
  );
}
