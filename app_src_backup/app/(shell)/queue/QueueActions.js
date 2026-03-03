'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiClients } from '@/lib/api/client';
export function QueueActions({ infoHash, status }) {
    const queryClient = useQueryClient();
    const api = getApiClients().torrentApi;
    const pauseMutation = useMutation({
        mutationFn: () => api.pause(infoHash),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['torrents'] })
    });
    const resumeMutation = useMutation({
        mutationFn: () => api.resume(infoHash),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['torrents'] })
    });
    const removeMutation = useMutation({
        mutationFn: () => api.remove(infoHash),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['torrents'] })
    });
    return (_jsxs("div", { className: "flex gap-2", children: [status === 'downloading' || status === 'seeding' ? (_jsx("button", { onClick: () => pauseMutation.mutate(), className: "p-1 text-xs bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 min-w-[60px]", disabled: pauseMutation.isPending, children: "Pause" })) : null, status === 'paused' ? (_jsx("button", { onClick: () => resumeMutation.mutate(), className: "p-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200 min-w-[60px]", disabled: resumeMutation.isPending, children: "Resume" })) : null, _jsx("button", { onClick: () => removeMutation.mutate(), className: "p-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200 min-w-[60px]", disabled: removeMutation.isPending, children: "Remove" })] }));
}
//# sourceMappingURL=QueueActions.js.map