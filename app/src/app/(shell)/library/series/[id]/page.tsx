'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';

type SeriesDetail = {
  id: number;
  title: string;
  year?: number;
  status?: string;
  monitored?: boolean;
  seasons?: Array<{
    seasonNumber: number;
    monitored?: boolean;
    episodes?: Array<{
      id: number;
      episodeNumber: number;
      title: string;
      monitored?: boolean;
      path?: string | null;
    }>;
  }>;
};

export default function SeriesDetailPage() {
  const api = useMemo(() => getApiClients(), []);
  const { pushToast } = useToast();
  const params = useParams<{ id: string }>();
  const id = Number.parseInt(params.id, 10);

  const [episodeMonitored, setEpisodeMonitored] = useState<Record<number, boolean>>({});

  const seriesQuery = useApiQuery({
    queryKey: queryKeys.seriesDetail(id),
    queryFn: () => api.mediaApi.getSeries(id) as Promise<SeriesDetail>,
    staleTimeKind: 'detail',
  });

  const series = seriesQuery.data;

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{series?.title ?? 'Series Detail'}</h1>
        <p className="text-sm text-text-secondary">
          Year: {series?.year ?? '-'} · Status: {series?.status ?? 'unknown'}
        </p>
      </header>

      <QueryPanel
        isLoading={seriesQuery.isPending}
        isError={seriesQuery.isError}
        isEmpty={Boolean(seriesQuery.isSuccess && !series)}
        errorMessage={seriesQuery.error?.message}
        onRetry={() => void seriesQuery.refetch()}
        emptyTitle="Series not found"
        emptyBody="The selected series no longer exists."
      >
        <div className="space-y-3">
          {(series?.seasons ?? []).map(season => (
            <details key={season.seasonNumber} className="rounded-md border border-border-subtle bg-surface-1" open>
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-text-primary">
                Season {season.seasonNumber}
              </summary>
              <div className="space-y-2 border-t border-border-subtle px-4 py-3">
                {(season.episodes ?? []).map(episode => {
                  const monitored = episodeMonitored[episode.id] ?? Boolean(episode.monitored);
                  const hasFile = Boolean(episode.path);

                  return (
                    <div key={episode.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-sm bg-surface-0 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">
                          E{episode.episodeNumber}: {episode.title}
                        </p>
                        <p className="text-xs text-text-secondary">{hasFile ? episode.path : 'File missing'}</p>
                      </div>
                      <StatusBadge status={hasFile ? 'completed' : 'wanted'} />
                      <label className="inline-flex items-center gap-2 text-xs text-text-secondary">
                        <input
                          type="checkbox"
                          checked={monitored}
                          onChange={event => {
                            setEpisodeMonitored(current => ({
                              ...current,
                              [episode.id]: event.currentTarget.checked,
                            }));
                            pushToast({
                              title: 'Episode monitor state updated locally',
                              message: 'Per-episode persistence API is planned in a follow-up.',
                              variant: 'info',
                            });
                          }}
                        />
                        Monitored
                      </label>
                    </div>
                  );
                })}
              </div>
            </details>
          ))}
        </div>
      </QueryPanel>

      <Link href="/library/series" className="inline-flex rounded-sm border border-border-subtle px-3 py-1 text-sm">
        Back to Series
      </Link>
    </section>
  );
}
