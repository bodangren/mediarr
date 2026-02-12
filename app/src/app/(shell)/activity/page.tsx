'use client';

import { useMemo } from 'react';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { formatRelativeDate } from '@/lib/format';

type ActivityItem = {
  id: number;
  eventType: string;
  summary: string;
  sourceModule?: string;
  occurredAt?: string;
};

interface PaginatedMeta {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export default function ActivityPage() {
  const api = useMemo(() => getApiClients(), []);

  const activityQuery = useApiQuery({
    queryKey: queryKeys.activity({ page: 1, pageSize: 25 }),
    queryFn: () => api.activityApi.list({ page: 1, pageSize: 25 }) as Promise<{ items: ActivityItem[]; meta: PaginatedMeta }>,
    staleTimeKind: 'list',
    isEmpty: data => data.items.length === 0,
  });

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Activity</h1>
        <p className="text-sm text-text-secondary">Consolidated timeline (expanded insights in Track 7E).</p>
      </header>

      <QueryPanel
        isLoading={activityQuery.isPending}
        isError={activityQuery.isError}
        isEmpty={activityQuery.isResolvedEmpty}
        errorMessage={activityQuery.error?.message}
        onRetry={() => void activityQuery.refetch()}
        emptyTitle="No activity"
        emptyBody="Events will appear as operations run."
      >
        <ul className="space-y-2">
          {(activityQuery.data?.items ?? []).map(item => (
            <li key={item.id} className="rounded-md border border-border-subtle bg-surface-1 px-3 py-2">
              <p className="text-sm font-medium">{item.summary}</p>
              <p className="text-xs text-text-secondary">
                {item.eventType} · {item.sourceModule ?? 'core'} · {formatRelativeDate(item.occurredAt)}
              </p>
            </li>
          ))}
        </ul>
      </QueryPanel>
    </section>
  );
}
