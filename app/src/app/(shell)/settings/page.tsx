'use client';

import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';

export default function SettingsPage() {
  const api = useMemo(() => getApiClients(), []);
  const queryClient = useQueryClient();
  const { pushToast } = useToast();

  const settingsQuery = useApiQuery({
    queryKey: queryKeys.settings(),
    queryFn: () => api.settingsApi.get(),
    staleTimeKind: 'detail',
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      api.settingsApi.update({
        pathVisibility: {
          showDownloadPath: true,
          showMediaPath: true,
        },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settings'] });
      pushToast({
        title: 'Settings saved',
        variant: 'success',
      });
    },
  });

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-text-secondary">Settings surface is expanded in Track 7E.</p>
      </header>

      <QueryPanel
        isLoading={settingsQuery.isPending}
        isError={settingsQuery.isError}
        isEmpty={false}
        errorMessage={settingsQuery.error?.message}
        onRetry={() => void settingsQuery.refetch()}
        emptyTitle="Settings unavailable"
        emptyBody=""
      >
        <section className="rounded-md border border-border-subtle bg-surface-1 p-4 text-sm">
          <p className="text-text-secondary">Torrent monitoring interval</p>
          <p className="mt-1 text-text-primary">
            {settingsQuery.data?.schedulerIntervals.torrentMonitoringSeconds ?? '-'} seconds
          </p>

          <button
            type="button"
            className="mt-3 rounded-sm border border-border-subtle px-3 py-1"
            onClick={() => saveMutation.mutate()}
          >
            Save
          </button>
        </section>
      </QueryPanel>
    </section>
  );
}
