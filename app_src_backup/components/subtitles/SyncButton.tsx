'use client';

import { useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/primitives/Button';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';

interface SyncButtonProps {
  seriesId: number;
  disabled?: boolean;
}

export function SyncButton({ seriesId, disabled }: SyncButtonProps) {
  const api = useMemo(() => getApiClients(), []);
  const { pushToast } = useToast();

  const syncMutation = useMutation({
    mutationFn: () => api.subtitleApi.syncSeries(seriesId),
    onSuccess: data => {
      pushToast({
        title: 'Sync Complete',
        message: data.message,
        variant: 'success',
      });
    },
    onError: error => {
      pushToast({
        title: 'Sync Failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'error',
      });
    },
  });

  return (
    <Button
      variant="secondary"
      onClick={() => syncMutation.mutate()}
      disabled={disabled || syncMutation.isPending}
    >
      {syncMutation.isPending ? 'Syncing...' : 'Sync'}
    </Button>
  );
}
