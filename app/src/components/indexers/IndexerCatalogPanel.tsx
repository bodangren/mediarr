import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/providers/ToastProvider';
import type { CatalogEntry } from '@/lib/api/indexerApi';
import { getApiClients } from '@/lib/api/client';

interface IndexerCatalogPanelProps {
  onIndexerAdded?: () => void;
}

interface GroupedCatalog {
  public: CatalogEntry[];
  semiPrivate: CatalogEntry[];
  private: CatalogEntry[];
}

function classifyPrivacy(entry: CatalogEntry): 'public' | 'semiPrivate' | 'private' {
  if (!entry.requiresApiKey) return 'public';
  const identifier = `${entry.id} ${entry.name}`.toLowerCase();
  if (identifier.includes('drunken') || identifier.includes('tabula') || identifier.includes('nzbgear') || identifier.includes('slug')) {
    return 'semiPrivate';
  }
  return 'private';
}

export function IndexerCatalogPanel({ onIndexerAdded }: IndexerCatalogPanelProps) {
  const api = useMemo(() => getApiClients(), []);
  const { pushToast } = useToast();
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});

  const loadCatalog = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const entries = await api.indexerApi.getCatalog();
      setCatalog(entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load catalog');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadCatalog();
  }, []);

  const grouped = useMemo<GroupedCatalog>(() => {
    const result: GroupedCatalog = { public: [], semiPrivate: [], private: [] };
    for (const entry of catalog) {
      result[classifyPrivacy(entry)].push(entry);
    }
    return result;
  }, [catalog]);

  const handleAdd = async (entry: CatalogEntry) => {
    if (entry.requiresApiKey && !apiKeys[entry.id]?.trim()) {
      pushToast({
        title: 'API key required',
        message: `Please enter an API key for ${entry.name}`,
        variant: 'error',
      });
      return;
    }

    setAddingIds(prev => new Set(prev).add(entry.id));
    try {
      await api.indexerApi.addFromCatalog(
        entry.id,
        entry.requiresApiKey ? apiKeys[entry.id] : undefined,
      );
      pushToast({
        title: 'Indexer added',
        message: `${entry.name} has been added successfully`,
        variant: 'success',
      });
      await loadCatalog();
      onIndexerAdded?.();
    } catch (err) {
      pushToast({
        title: 'Failed to add indexer',
        message: err instanceof Error ? err.message : 'Unknown error',
        variant: 'error',
      });
    } finally {
      setAddingIds(prev => {
        const next = new Set(prev);
        next.delete(entry.id);
        return next;
      });
    }
  };

  const isAdding = (id: string) => addingIds.has(id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Indexer Catalog</h2>
        </div>
        <p className="text-sm text-text-secondary">Loading catalog...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Indexer Catalog</h2>
        </div>
        <p className="text-sm text-status-error">{error}</p>
        <Button variant="outline" size="sm" onClick={() => void loadCatalog()}>
          Retry
        </Button>
      </div>
    );
  }

  const renderGroup = (title: string, entries: CatalogEntry[], variant: 'default' | 'secondary' | 'outline') => {
    if (entries.length === 0) return null;
    return (
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wide">{title}</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map(entry => (
            <article
              key={entry.id}
              aria-label={entry.name}
              className="flex flex-col gap-2 rounded-sm border border-border-subtle bg-surface-1 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-text-primary truncate">{entry.name}</p>
                  <p className="text-xs text-text-secondary line-clamp-2">{entry.description}</p>
                </div>
                {entry.isConfigured && (
                  <Badge variant="secondary" className="shrink-0 text-[10px]">Configured</Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-1">
                <Badge variant={variant} className="text-[10px]">
                  {entry.type.toUpperCase()}
                </Badge>
                {entry.requiresApiKey ? (
                  <Badge variant="outline" className="text-[10px]">API Key Required</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">Free</Badge>
                )}
              </div>

              {entry.requiresApiKey ? (
                <div className="flex flex-col gap-2">
                  <Input
                    type="password"
                    placeholder="Enter API key..."
                    value={apiKeys[entry.id] ?? ''}
                    onChange={e => setApiKeys(prev => ({ ...prev, [entry.id]: e.target.value }))}
                    disabled={isAdding(entry.id) || entry.isConfigured}
                    className="h-8 text-xs"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs flex-1"
                      disabled={isAdding(entry.id) || entry.isConfigured}
                      onClick={() => window.open(entry.signupUrl, '_blank')}
                    >
                      Sign Up
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="h-7 text-xs flex-1"
                      disabled={isAdding(entry.id) || entry.isConfigured}
                      onClick={() => void handleAdd(entry)}
                    >
                      {isAdding(entry.id) ? 'Adding...' : 'Add'}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant={entry.isConfigured ? 'secondary' : 'default'}
                  size="sm"
                  className="h-7 text-xs w-full"
                  disabled={isAdding(entry.id) || entry.isConfigured}
                  onClick={() => void handleAdd(entry)}
                >
                  {entry.isConfigured ? 'Already Added' : isAdding(entry.id) ? 'Adding...' : 'Add'}
                </Button>
              )}
            </article>
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Indexer Catalog</h2>
        <Button variant="ghost" size="sm" onClick={() => void loadCatalog()}>
          Refresh
        </Button>
      </div>

      {catalog.length === 0 ? (
        <p className="text-sm text-text-secondary">No indexers available in the catalog.</p>
      ) : (
        <div className="space-y-6">
          {renderGroup('Public Indexers', grouped.public, 'default')}
          {renderGroup('Semi-Private Indexers', grouped.semiPrivate, 'secondary')}
          {renderGroup('Private Indexers', grouped.private, 'outline')}
        </div>
      )}
    </div>
  );
}
