import { useMemo, useState, type FormEvent } from 'react';
import { RouteScaffold } from '@/components/primitives/RouteScaffold';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import type { MetadataSearchResult } from '@/lib/api/mediaApi';

function getPosterUrl(images?: Array<{ coverType: string; url: string }>): string | undefined {
  if (!images?.length) return undefined;
  return (
    images.find(img => img.coverType.toLowerCase() === 'poster')?.url ??
    images[0].url
  );
}

export function SearchPage() {
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
