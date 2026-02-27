'use client';

import { useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/primitives/Button';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';

interface SearchButtonProps {
  seriesId: number;
  disabled?: boolean;
}

export function SearchButton({ seriesId, disabled }: SearchButtonProps) {
  const api = useMemo(() => getApiClients(), []);
  const { pushToast } = useToast();

  const searchMutation = useMutation({
    mutationFn: () => api.subtitleApi.searchSeriesSubtitles(seriesId),
    onSuccess: data => {
      pushToast({
        title: 'Search Complete',
        message: `Downloaded ${data.subtitlesDownloaded} subtitles for ${data.episodesSearched} episodes`,
        variant: 'success',
      });
    },
    onError: error => {
      pushToast({
        title: 'Search Failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'error',
      });
    },
  });

  return (
    <Button
      variant="secondary"
      onClick={() => searchMutation.mutate()}
      disabled={disabled || searchMutation.isPending}
    >
      {searchMutation.isPending ? 'Searching...' : 'Search All'}
    </Button>
  );
}
