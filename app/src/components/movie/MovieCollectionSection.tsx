'use client';

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getApiClients } from '@/lib/api/client';
import { useToast } from '@/components/providers/ToastProvider';
import { Icon } from '@/components/primitives/Icon';

interface DetectedCollection {
  tmdbCollectionId: number;
  name: string;
  posterUrl: string | null;
}

export interface MovieCollectionSectionProps {
  movieId: number;
  tmdbId?: number;
  collection: { id: number; name: string } | null | undefined;
  onCollectionAdded?: () => void;
}

export function MovieCollectionSection({ movieId, tmdbId, collection, onCollectionAdded }: MovieCollectionSectionProps) {
  const api = useMemo(() => getApiClients(), []);
  const { pushToast } = useToast();
  const [detected, setDetected] = useState<DetectedCollection | null>(null);
  const [monitored, setMonitored] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (collection || !tmdbId) return;

    void api.movieApi.getTmdbCollection(movieId).then(result => {
      if (result.collection) {
        setDetected(result.collection);
      }
    });
  }, [api, movieId, tmdbId, collection]);

  if (collection) {
    return (
      <div className="flex items-center gap-1.5">
        <Icon name="package" className="h-4 w-4" />
        <Link
          to={`/library/collections/${collection.id}`}
          className="hover:text-accent-primary hover:underline"
        >
          {collection.name}
        </Link>
      </div>
    );
  }

  if (!detected) return null;

  const handleAdd = async () => {
    setAdding(true);
    try {
      const created = await api.collectionApi.create({ tmdbCollectionId: detected.tmdbCollectionId, monitored });
      await api.collectionApi.sync(created.id);
      pushToast({ title: 'Collection added', variant: 'success', message: `${detected.name} added and library synced.` });
      onCollectionAdded?.();
    } catch (err) {
      pushToast({ title: 'Error', variant: 'error', message: err instanceof Error ? err.message : 'Failed to add collection' });
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-sm border border-border-subtle bg-surface-2 px-3 py-2 text-sm">
      <Icon name="package" className="h-4 w-4 text-text-secondary" />
      <span className="font-medium text-text-primary">{detected.name}</span>
      <span className="text-text-muted text-xs">detected on TMDB</span>
      <label className="flex items-center gap-1.5 text-text-secondary">
        <input
          type="checkbox"
          aria-label="Monitor collection"
          checked={monitored}
          onChange={e => setMonitored(e.target.checked)}
        />
        Monitor
      </label>
      <button
        type="button"
        aria-label="Add to Library"
        disabled={adding}
        onClick={() => { void handleAdd(); }}
        className="rounded-sm bg-accent-primary px-3 py-1 text-xs font-medium text-white hover:bg-accent-primary/80 disabled:opacity-50"
      >
        {adding ? 'Adding…' : 'Add to Library'}
      </button>
    </div>
  );
}
