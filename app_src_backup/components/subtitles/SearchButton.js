'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/primitives/Button';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
export function SearchButton({ seriesId, disabled }) {
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
    return (_jsx(Button, { variant: "secondary", onClick: () => searchMutation.mutate(), disabled: disabled || searchMutation.isPending, children: searchMutation.isPending ? 'Searching...' : 'Search All' }));
}
//# sourceMappingURL=SearchButton.js.map