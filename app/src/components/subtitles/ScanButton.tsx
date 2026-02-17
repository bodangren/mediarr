'use client';

import { useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/primitives/Button';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';

interface ScanButtonProps {
  seriesId: number;
  disabled?: boolean;
}

export function ScanButton({ seriesId, disabled }: ScanButtonProps) {
  const api = useMemo(() => getApiClients(), []);
  const { pushToast } = useToast();

  const scanMutation = useMutation({
    mutationFn: () => api.subtitleApi.scanSeriesDisk(seriesId),
    onSuccess: data => {
      pushToast({
        title: 'Scan Complete',
        message: data.message,
        variant: 'success',
      });
    },
    onError: error => {
      pushToast({
        title: 'Scan Failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'error',
      });
    },
  });

  return (
    <Button
      variant="secondary"
      onClick={() => scanMutation.mutate()}
      disabled={disabled || scanMutation.isPending}
    >
      {scanMutation.isPending ? 'Scanning...' : 'Scan Disk'}
    </Button>
  );
}
