'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/primitives/Button';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
export function ScanButton({ seriesId, disabled }) {
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
    return (_jsx(Button, { variant: "secondary", onClick: () => scanMutation.mutate(), disabled: disabled || scanMutation.isPending, children: scanMutation.isPending ? 'Scanning...' : 'Scan Disk' }));
}
//# sourceMappingURL=ScanButton.js.map