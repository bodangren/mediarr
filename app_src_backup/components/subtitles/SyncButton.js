'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/primitives/Button';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
export function SyncButton({ seriesId, disabled }) {
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
    return (_jsx(Button, { variant: "secondary", onClick: () => syncMutation.mutate(), disabled: disabled || syncMutation.isPending, children: syncMutation.isPending ? 'Syncing...' : 'Sync' }));
}
//# sourceMappingURL=SyncButton.js.map